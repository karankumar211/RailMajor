"""RailOpt AI - Recommendation & Decision Service
Handles retrieval of generated dispatch recommendations, records immutable
controller decisions (accept, override, modify), and advances the digital twin telemetry.
"""
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.database.models import Recommendation, ControllerDecision, Conflict, TrainState, Schedule

def get_recommendations_for_conflict(db: Session, conflict_id: str) -> List[Recommendation]:
    """Fetches all recommendations associated with a conflict ordered by rank."""
    return (
        db.query(Recommendation)
        .filter(Recommendation.conflict_id == conflict_id)
        .order_by(Recommendation.rank.asc())
        .all()
    )

def record_controller_decision(
    db: Session,
    rec_id: str,
    controller_id: str,
    decision_type: str,
    override_action: Optional[str] = None
) -> ControllerDecision:
    """Records an immutable human controller decision (accept, override, modify).
    1. Persists the ControllerDecision record.
    2. Updates conflict status to RESOLVED, OVERRIDDEN, or MODIFIED.
    3. Physically propagates hold adjustments into TrainState and Schedule telemetry.
    """
    rec = db.query(Recommendation).filter(Recommendation.rec_id == rec_id).first()
    if not rec:
        raise ValueError(f"Recommendation '{rec_id}' not found.")

    decision_id = f"DEC_{uuid.uuid4().hex[:12].upper()}"
    decision = ControllerDecision(
        decision_id=decision_id,
        rec_id=rec_id,
        controller_id=controller_id,
        decision_type=decision_type.lower(),
        override_action=override_action,
        timestamp=datetime.utcnow(),
    )
    db.add(decision)

    # 1. Update parent conflict status
    conflict = db.query(Conflict).filter(Conflict.conflict_id == rec.conflict_id).first()
    if conflict:
        if decision_type.lower() == "accept":
            conflict.status = "RESOLVED"
        elif decision_type.lower() == "override":
            conflict.status = "OVERRIDDEN"
        elif decision_type.lower() == "modify":
            conflict.status = "MODIFIED"

    # 2. Advance Digital Twin state if an action with hold duration was applied
    target_train_id = rec.target_train_id
    hold_mins = rec.hold_minutes or 0

    # If controller modified the duration, extract from override_action
    if decision_type.lower() == "modify" and override_action:
        try:
            # Look for number in string like "Modified hold duration to 8 mins."
            words = override_action.split()
            for w in words:
                if w.isdigit():
                    hold_mins = int(w)
                    break
        except Exception:
            pass

    if target_train_id and hold_mins > 0 and decision_type.lower() in ("accept", "modify"):
        # Update latest TrainState
        latest_state = (
            db.query(TrainState)
            .filter(TrainState.train_id == target_train_id)
            .order_by(TrainState.timestamp.desc())
            .first()
        )
        if latest_state:
            latest_state.delay_minutes += float(hold_mins)

        # Shift downstream schedules
        downstream_schedules = (
            db.query(Schedule)
            .filter(Schedule.train_id == target_train_id)
            .all()
        )
        hold_delta = timedelta(minutes=hold_mins)
        for sch in downstream_schedules:
            if conflict and sch.planned_arrival >= conflict.window_start:
                sch.planned_arrival += hold_delta
                sch.planned_departure += hold_delta

    db.commit()
    db.refresh(decision)
    return decision
