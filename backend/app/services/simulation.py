"""RailOpt AI - Simulation / What-If Engine
Provides pure in-memory projections of candidate dispatch actions without DB mutation.
Applies schedule adjustments to target trains, propagates downstream delays,
and detects whether conflicts are resolved or new downstream conflicts are created.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from app.database.models import Conflict, Schedule, Train, TrainState

def simulate_action(
    db: Session,
    conflict_id: Optional[str],
    action_type: str,
    target_train: str,
    hold_minutes: int,
) -> Dict[str, Any]:
    """Pure simulation function: evaluates what happens if `target_train` is held for `hold_minutes`.
    1. Loads target train schedules in-memory (detached from SQLAlchemy session).
    2. Shifts downstream schedule intervals forward by `hold_minutes`.
    3. Re-runs interval-overlap detection against other trains on the affected resources.
    4. Evaluates whether the original conflict is resolved and tracks any new conflicts introduced.
    5. Leaves SQLite database completely untouched.
    """
    # 1. Fetch conflict and target train metadata
    conflict = db.query(Conflict).filter(Conflict.conflict_id == conflict_id).first() if conflict_id else None
    train_obj = db.query(Train).filter(Train.train_id == target_train).first()
    if not train_obj:
        raise ValueError(f"Target train '{target_train}' not found.")

    # 2. Fetch all schedules for target train ordered by arrival time
    schedules_raw = (
        db.query(Schedule)
        .filter(Schedule.train_id == target_train)
        .order_by(Schedule.sequence_order.asc(), Schedule.planned_arrival.asc())
        .all()
    )

    if not schedules_raw:
        return {
            "conflict_id": conflict_id,
            "action_type": action_type,
            "target_train": target_train,
            "hold_minutes": hold_minutes,
            "original_conflict_resolved": False,
            "projected_state": [],
            "projected_delay_summary": {
                "total_added_delay_minutes": 0,
                "original_conflict_status": "NO_SCHEDULES",
                "new_conflicts_introduced": [],
                "net_conflict_change": 0,
            }
        }

    # Determine from which schedule entry the hold applies
    shift_index = 0
    if conflict:
        for idx, s in enumerate(schedules_raw):
            if s.resource_id == conflict.resource_id:
                shift_index = idx
                break
            elif s.planned_arrival <= conflict.window_start <= s.planned_departure:
                shift_index = idx
                break

    # 3. Create detached in-memory projected schedule copies
    projected_schedules: List[Dict[str, Any]] = []
    hold_delta = timedelta(minutes=hold_minutes)

    for idx, s in enumerate(schedules_raw):
        orig_arr = s.planned_arrival
        orig_dep = s.planned_departure

        if idx < shift_index:
            # Pre-hold schedules remain unchanged
            new_arr = orig_arr
            new_dep = orig_dep
            delay_added = 0
        elif idx == shift_index:
            # Hold location:
            # If held at a platform, arrival is unchanged, departure is delayed
            # If held before a block, entry (arrival) and exit (departure) are delayed
            if s.resource_type == "platform" and action_type == "HOLD_AT_LOOP":
                new_arr = orig_arr
                new_dep = orig_dep + hold_delta
            else:
                new_arr = orig_arr + hold_delta
                new_dep = orig_dep + hold_delta
            delay_added = hold_minutes
        else:
            # Downstream entries: both arrival and departure shift forward
            new_arr = orig_arr + hold_delta
            new_dep = orig_dep + hold_delta
            delay_added = hold_minutes

        projected_schedules.append({
            "schedule_id": s.schedule_id,
            "resource_id": s.resource_id,
            "resource_type": s.resource_type,
            "sequence_order": s.sequence_order,
            "original_arrival": orig_arr.isoformat(),
            "original_departure": orig_dep.isoformat(),
            "projected_arrival": new_arr.isoformat(),
            "projected_departure": new_dep.isoformat(),
            "new_arrival_dt": new_arr,
            "new_departure_dt": new_dep,
            "delay_delta_minutes": delay_added,
        })

    # 4. Check for downstream conflicts on the affected resources
    affected_resources = {ps["resource_id"] for ps in projected_schedules[shift_index:]}
    
    other_schedules = (
        db.query(Schedule)
        .filter(
            Schedule.resource_id.in_(affected_resources),
            Schedule.train_id != target_train,
        )
        .all()
    )

    other_train_map = {t.train_id: t for t in db.query(Train).all()}

    original_conflict_still_exists = False
    new_conflicts_introduced = []

    for ps in projected_schedules[shift_index:]:
        res_id = ps["resource_id"]
        res_schedules = [os for os in other_schedules if os.resource_id == res_id]

        for os in res_schedules:
            # Check overlap between projected interval and other train's interval
            overlap_start = max(ps["new_arrival_dt"], os.planned_arrival)
            overlap_end = min(ps["new_departure_dt"], os.planned_departure)

            if overlap_start < overlap_end:
                overlap_mins = round((overlap_end - overlap_start).total_seconds() / 60.0, 1)
                
                # Check if this is the original conflict
                is_original = False
                if conflict and res_id == conflict.resource_id:
                    other_id = conflict.train_b_id if target_train == conflict.train_a_id else conflict.train_a_id
                    if os.train_id == other_id:
                        is_original = True
                        original_conflict_still_exists = True

                other_t = other_train_map.get(os.train_id)
                conflict_entry = {
                    "resource_id": res_id,
                    "resource_type": ps["resource_type"],
                    "conflicting_train_id": os.train_id,
                    "conflicting_train_number": other_t.train_number if other_t else os.train_id,
                    "conflicting_train_priority": other_t.priority_class if other_t else "Unknown",
                    "window_start": overlap_start.strftime("%H:%M"),
                    "window_end": overlap_end.strftime("%H:%M"),
                    "overlap_minutes": overlap_mins,
                    "is_original_conflict": is_original,
                }

                if not is_original:
                    new_conflicts_introduced.append(conflict_entry)

    original_conflict_resolved = (conflict is not None) and (not original_conflict_still_exists)

    # Clean in-memory datetime objects before returning payload
    cleaned_projected_state = []
    for ps in projected_schedules:
        copy_ps = dict(ps)
        copy_ps.pop("new_arrival_dt", None)
        copy_ps.pop("new_departure_dt", None)
        cleaned_projected_state.append(copy_ps)

    net_change = len(new_conflicts_introduced) - (1 if original_conflict_resolved else 0)

    return {
        "conflict_id": conflict_id,
        "action_type": action_type,
        "target_train": target_train,
        "hold_minutes": hold_minutes,
        "original_conflict_resolved": original_conflict_resolved,
        "projected_state": cleaned_projected_state,
        "projected_delay_summary": {
            "total_added_delay_minutes": hold_minutes,
            "original_conflict_status": "RESOLVED" if original_conflict_resolved else ("PERSISTS" if conflict else "N/A"),
            "new_conflicts_count": len(new_conflicts_introduced),
            "new_conflicts_introduced": new_conflicts_introduced,
            "net_conflict_change": net_change,
        },
    }
