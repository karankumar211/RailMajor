"""RailOpt AI - Recommendation & Decision Routes
Handles controller decisions (ACCEPT, OVERRIDE, MODIFY) and broadcasts audit events.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.database.models import User
from app.schemas.schemas import DecisionRequest, DecisionResponse
from app.services.recommendation import record_controller_decision
from app.sockets.ws_manager import ws_manager
from app.auth.dependencies import get_current_user, get_optional_current_user

router = APIRouter(prefix="/recommendations", tags=["Recommendations & Decisions"])

@router.post("/{rec_id}/decision", response_model=DecisionResponse)
async def submit_controller_decision(
    rec_id: str,
    body: DecisionRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Records an immutable human controller decision (ACCEPT, OVERRIDE, MODIFY)
    on a candidate recommendation and broadcasts decision.recorded.
    Supports authenticated controller JWT; falls back to body.controller_id if unauthenticated.
    """
    valid_decisions = {"ACCEPT", "OVERRIDE", "MODIFY"}
    decision_type_upper = body.decision_type.upper()
    if decision_type_upper not in valid_decisions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid decision_type '{body.decision_type}'. Must be one of {valid_decisions}.",
        )

    # Use authenticated controller's username, or fall back to body controller_id
    effective_controller_id = (current_user.username if current_user else None) or body.controller_id or "controller"

    try:
        decision = record_controller_decision(
            db=db,
            rec_id=rec_id,
            controller_id=effective_controller_id,
            decision_type=decision_type_upper,
            override_action=body.override_action,
        )

        # Broadcast decision.recorded event via WebSocket
        await ws_manager.broadcast({
            "event": "decision.recorded",
            "decision_id": decision.decision_id,
            "rec_id": rec_id,
            "controller_id": decision.controller_id,
            "decision_type": decision.decision_type,
            "timestamp": decision.timestamp.isoformat(),
        })

        return DecisionResponse(
            decision_id=decision.decision_id,
            status="RECORDED",
            rec_id=decision.rec_id,
            decision_type=decision.decision_type,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
