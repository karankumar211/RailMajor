"""RailOpt AI - Conflict Routes
Endpoints for querying conflicts and retrieving ranked recommendations.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.database.models import Conflict, Recommendation
from app.services.optimizer import resolve_conflict
from app.sockets.ws_manager import ws_manager

router = APIRouter(prefix="/conflicts", tags=["Conflicts"])

@router.get("/{conflict_id}/recommendations")
async def get_conflict_recommendations(conflict_id: str, db: Session = Depends(get_db)):
    """Returns ranked recommendations for the given conflict in the exact Module 3 format.
    Generates and persists recommendations if not yet calculated.
    """
    conflict = db.query(Conflict).filter(Conflict.conflict_id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail=f"Conflict '{conflict_id}' not found.")

    # Check if recommendations already exist
    recs = (
        db.query(Recommendation)
        .filter(Recommendation.conflict_id == conflict_id)
        .order_by(Recommendation.rank.asc())
        .all()
    )

    if recs:
        recommendations_payload = [
            {
                "rec_id": r.rec_id,
                "rank": r.rank,
                "action_type": r.action_type,
                "target_train": r.target_train_id,
                "hold_minutes": r.hold_minutes,
                "rationale": r.rationale,
                "projected_delay_delta_minutes": r.projected_delay_delta or {},
            }
            for r in recs
        ]
        return {
            "conflict_id": conflict.conflict_id,
            "resource_id": conflict.resource_id,
            "trains": [conflict.train_a_id, conflict.train_b_id],
            "recommendations": recommendations_payload,
        }

    # Generate on the fly if not cached
    resolution = resolve_conflict(db, conflict)

    # Broadcast recommendation.ready event
    await ws_manager.broadcast({
        "event": "recommendation.ready",
        "conflict_id": conflict.conflict_id,
        "resource_id": conflict.resource_id,
        "recommendation_count": len(resolution["recommendations"]),
    })

    return resolution
