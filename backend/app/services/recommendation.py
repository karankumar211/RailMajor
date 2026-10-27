"""RailOpt AI - Recommendation & Decision Service
Handles retrieval of generated dispatch recommendations and records immutable
controller decisions (accept, override, modify).
"""
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.database.models import Recommendation, ControllerDecision, Conflict

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
    Updates conflict status to RESOLVED (or OVERRIDDEN).
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

    # Update parent conflict status
    conflict = db.query(Conflict).filter(Conflict.conflict_id == rec.conflict_id).first()
    if conflict:
        if decision_type.lower() == "accept":
            conflict.status = "RESOLVED"
        elif decision_type.lower() == "override":
            conflict.status = "OVERRIDDEN"
        elif decision_type.lower() == "modify":
            conflict.status = "MODIFIED"

    db.commit()
    db.refresh(decision)
    return decision
