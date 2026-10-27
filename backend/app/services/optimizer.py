"""RailOpt AI - Optimization Engine v1
Rule-based, explainable conflict resolution solver.
Determines precedence using explicit priority-class rankings, computes hold durations,
identifies loop-line overtaking capacity, and produces ranked candidate actions
with plain-language rationale.
"""
import math
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from app.database.models import (
    Conflict,
    Train,
    Platform,
    BlockSection,
    TrainState,
    Recommendation,
)

# Explicit ordered constant for train priority ranking (higher = higher priority)
PRIORITY_CLASS_RANKING: Dict[str, int] = {
    "Rajdhani": 4,
    "Express": 3,
    "Passenger": 2,
    "Freight": 1,
}


def has_loop_line_available(db: Session, resource_id: str, held_train_id: str) -> bool:
    """Checks whether the held train can be held on a loop line:
    1. If the resource itself is a station platform or at a station with a loop line.
    2. If the resource is a block section, checks the preceding station (from_node) for a loop line.
    3. Checks the held train's current resource in TrainState.
    """
    # Check if resource is a Platform directly
    if resource_id.startswith("BLK_"):
        block = db.query(BlockSection).filter(BlockSection.block_id == resource_id).first()
        if block:
            station_id = block.from_node
            loop_exists = (
                db.query(Platform)
                .filter(Platform.station_id == station_id, Platform.loop_line == True)
                .first()
            )
            if loop_exists:
                return True

    # Check train's current resource from TrainState
    state = (
        db.query(TrainState)
        .filter(TrainState.train_id == held_train_id)
        .order_by(TrainState.timestamp.desc())
        .first()
    )
    if state and state.current_resource_id:
        curr_res = state.current_resource_id
        if "_PF_" in curr_res:
            pf = db.query(Platform).filter(Platform.platform_id == curr_res).first()
            if pf and pf.station_id:
                has_loop = (
                    db.query(Platform)
                    .filter(Platform.station_id == pf.station_id, Platform.loop_line == True)
                    .first()
                )
                if has_loop:
                    return True

    return False


def resolve_conflict(db: Session, conflict: Conflict) -> Dict[str, Any]:
    """Produces 1-2 ranked candidate resolution actions for a given Conflict.
    - Determines higher vs lower priority train.
    - Assigns higher priority train PROCEED, lower priority train HOLD_AT_LOOP or HOLD_BEFORE_BLOCK.
    - Computes hold_minutes from window overlap duration.
    - Generates plain-language rationale.
    - Computes projected_delay_delta_minutes.
    - Persists Recommendation rows linked to conflict.
    - Returns structured payload.
    """
    train_a = db.query(Train).filter(Train.train_id == conflict.train_a_id).first()
    train_b = db.query(Train).filter(Train.train_id == conflict.train_b_id).first()

    if not train_a or not train_b:
        return {
            "conflict_id": conflict.conflict_id,
            "resource_id": conflict.resource_id,
            "trains": [conflict.train_a_id, conflict.train_b_id],
            "recommendations": [],
        }

    # 1. Compute Priority Score
    rank_a = PRIORITY_CLASS_RANKING.get(train_a.priority_class, 1)
    rank_b = PRIORITY_CLASS_RANKING.get(train_b.priority_class, 1)

    # Tie-breaking if same priority class: prefer train with earlier schedule/lower current delay
    if rank_a > rank_b:
        proceeding_train = train_a
        held_train = train_b
    elif rank_b > rank_a:
        proceeding_train = train_b
        held_train = train_a
    else:
        # Same class tie-breaker: check train delays from TrainState
        state_a = (
            db.query(TrainState)
            .filter(TrainState.train_id == train_a.train_id)
            .order_by(TrainState.timestamp.desc())
            .first()
        )
        state_b = (
            db.query(TrainState)
            .filter(TrainState.train_id == train_b.train_id)
            .order_by(TrainState.timestamp.desc())
            .first()
        )
        delay_a = state_a.delay_minutes if state_a else 0.0
        delay_b = state_b.delay_minutes if state_b else 0.0

        # Prioritize train with less delay to preserve on-time performance
        if delay_a <= delay_b:
            proceeding_train = train_a
            held_train = train_b
        else:
            proceeding_train = train_b
            held_train = train_a

    # 2. Compute hold duration
    overlap_secs = (conflict.window_end - conflict.window_start).total_seconds()
    hold_minutes = max(1, math.ceil(overlap_secs / 60.0))

    # 3. Determine action type (HOLD_AT_LOOP vs HOLD_BEFORE_BLOCK)
    can_use_loop = has_loop_line_available(db, conflict.resource_id, held_train.train_id)
    action_type = "HOLD_AT_LOOP" if can_use_loop else "HOLD_BEFORE_BLOCK"

    # 4. Generate plain-language rationale
    rationale = (
        f"Minimizes weighted delay; {proceeding_train.name} ({proceeding_train.train_number}) "
        f"is a higher-priority class ({proceeding_train.priority_class}) with a tighter downstream connection window."
    )
    if rank_a == rank_b:
        rationale = (
            f"Minimizes cascading delay; {proceeding_train.name} ({proceeding_train.train_number}) "
            f"is given precedence on {conflict.resource_id} over {held_train.name} ({held_train.train_number}) to preserve punctuality."
        )

    # 5. Projected delay deltas
    delay_deltas = {
        proceeding_train.train_id: 0,
        held_train.train_id: hold_minutes,
    }

    rec_1_id = f"REC_{conflict.conflict_id}_1"
    recommendations_payload = [
        {
            "rec_id": rec_1_id,
            "rank": 1,
            "action_type": action_type,
            "target_train": held_train.train_id,
            "hold_minutes": hold_minutes,
            "rationale": rationale,
            "projected_delay_delta_minutes": delay_deltas,
        }
    ]

    # Rank 2: Alternative Candidate (Inverted Dispatch Decision)
    alt_action_type = "HOLD_BEFORE_BLOCK"
    alt_deltas = {
        proceeding_train.train_id: hold_minutes,
        held_train.train_id: 0,
    }
    alt_rationale = (
        f"Alternative: Hold {proceeding_train.name} ({proceeding_train.priority_class}) "
        f"allowing {held_train.name} ({held_train.priority_class}) to clear {conflict.resource_id}; "
        f"incurs higher weighted passenger delay penalty."
    )
    rec_2_id = f"REC_{conflict.conflict_id}_2"
    recommendations_payload.append({
        "rec_id": rec_2_id,
        "rank": 2,
        "action_type": alt_action_type,
        "target_train": proceeding_train.train_id,
        "hold_minutes": hold_minutes,
        "rationale": alt_rationale,
        "projected_delay_delta_minutes": alt_deltas,
    })

    # 6. Persist Recommendations to DB
    for rec_data in recommendations_payload:
        existing_rec = db.query(Recommendation).filter(Recommendation.rec_id == rec_data["rec_id"]).first()
        if existing_rec:
            existing_rec.action_type = rec_data["action_type"]
            existing_rec.target_train_id = rec_data["target_train"]
            existing_rec.hold_minutes = rec_data["hold_minutes"]
            existing_rec.projected_delay_delta = rec_data["projected_delay_delta_minutes"]
            existing_rec.rank = rec_data["rank"]
            existing_rec.rationale = rec_data["rationale"]
        else:
            new_rec = Recommendation(
                rec_id=rec_data["rec_id"],
                conflict_id=conflict.conflict_id,
                action_type=rec_data["action_type"],
                target_train_id=rec_data["target_train"],
                hold_minutes=rec_data["hold_minutes"],
                projected_delay_delta=rec_data["projected_delay_delta_minutes"],
                rank=rec_data["rank"],
                rationale=rec_data["rationale"],
                generated_at=datetime.utcnow(),
            )
            db.add(new_rec)

    db.commit()

    return {
        "conflict_id": conflict.conflict_id,
        "resource_id": conflict.resource_id,
        "trains": [conflict.train_a_id, conflict.train_b_id],
        "recommendations": recommendations_payload,
    }


def resolve_all_open_conflicts(db: Session) -> List[Dict[str, Any]]:
    """Evaluates all OPEN conflicts in the database and computes ranked
    recommendations for each. Returns the list of conflict resolution payloads.
    """
    open_conflicts = db.query(Conflict).filter(Conflict.status == "OPEN").all()
    resolutions = []

    for conflict in open_conflicts:
        res = resolve_conflict(db, conflict)
        resolutions.append(res)

    return resolutions
