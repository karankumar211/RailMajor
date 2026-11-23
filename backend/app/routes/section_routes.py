"""RailOpt AI - Section & Digital Twin Routes
Endpoints for division state, active conflicts, what-if simulations, and decision audit logs.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database.db import get_db
from app.database.models import (
    Station,
    Platform,
    BlockSection,
    Junction,
    Conflict,
    Recommendation,
    ControllerDecision,
)
from app.schemas.schemas import SimulateRequest
from app.services.digital_twin import get_section_state
from app.services.simulation import simulate_action

router = APIRouter(prefix="/section", tags=["Section & Digital Twin"])

@router.get("/{section_id}/state")
def get_division_state(section_id: str = "default", db: Session = Depends(get_db)):
    """Returns the current digital twin state: trains[], resources[], occupancy[]."""
    twin_state = get_section_state(db)

    # Compile physical infrastructure resources
    resources: List[Dict[str, Any]] = []

    # Platforms
    for pf in db.query(Platform).all():
        resources.append({
            "resource_id": pf.platform_id,
            "resource_type": "platform",
            "station_id": pf.station_id,
            "length_m": pf.length_m,
            "loop_line": pf.loop_line,
        })

    # Block sections
    for blk in db.query(BlockSection).all():
        resources.append({
            "resource_id": blk.block_id,
            "resource_type": "block",
            "from_node": blk.from_node,
            "to_node": blk.to_node,
            "length_km": blk.length_km,
            "max_speed_kmph": blk.max_speed_kmph,
            "track_direction": blk.track_direction,
        })

    # Junctions
    for jnc in db.query(Junction).all():
        resources.append({
            "resource_id": jnc.junction_id,
            "resource_type": "junction",
            "name": jnc.name,
            "connected_blocks": jnc.connected_blocks,
        })

    # Transform occupancy map to list
    occupancy_list = [
        {"resource_id": res_id, "train_ids": t_ids}
        for res_id, t_ids in twin_state["resource_occupancy"].items()
    ]

    return {
        "section_id": section_id,
        "timestamp": twin_state["timestamp"],
        "train_count": twin_state["train_count"],
        "trains": twin_state["trains"],
        "resources": resources,
        "occupancy": occupancy_list,
    }


@router.get("/{section_id}/conflicts")
def get_section_conflicts(section_id: str = "default", db: Session = Depends(get_db)):
    """Returns active OPEN conflicts on the section."""
    open_conflicts = db.query(Conflict).filter(Conflict.status == "OPEN").all()
    results = []

    for c in open_conflicts:
        duration_mins = (c.window_end - c.window_start).total_seconds() / 60.0
        results.append({
            "conflict_id": c.conflict_id,
            "resource_id": c.resource_id,
            "resource_type": c.resource_type,
            "conflict_type": c.conflict_type,
            "trains": [c.train_a_id, c.train_b_id],
            "status": c.status,
            "window": {
                "start": c.window_start.isoformat(),
                "end": c.window_end.isoformat(),
                "duration_minutes": round(duration_mins, 1),
            },
        })

    return results


@router.post("/{section_id}/simulate")
def simulate_section_action(
    req: SimulateRequest,
    section_id: str = "default",
    db: Session = Depends(get_db),
):
    """Executes a pure in-memory What-If projection for a candidate dispatch action."""
    try:
        result = simulate_action(
            db=db,
            conflict_id=req.conflict_id,
            action_type=req.action_type,
            target_train=req.target_train,
            hold_minutes=req.hold_minutes,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{section_id}/audit")
def get_section_audit_log(
    section_id: str = "default",
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Returns ControllerDecision history eagerly joined in a single SQL query without N+1 overhead."""
    decisions = (
        db.query(ControllerDecision)
        .options(
            joinedload(ControllerDecision.recommendation)
            .joinedload(Recommendation.conflict)
        )
        .order_by(ControllerDecision.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    audit_records = []
    for d in decisions:
        rec = d.recommendation
        conflict = rec.conflict if rec else None
        rec_data = None
        if rec:
            rec_data = {
                "rec_id": rec.rec_id,
                "action_type": rec.action_type,
                "target_train_id": rec.target_train_id,
                "hold_minutes": rec.hold_minutes,
                "projected_delay_delta": rec.projected_delay_delta or {},
                "rank": rec.rank,
                "rationale": rec.rationale,
            }

        audit_records.append({
            "decision_id": d.decision_id,
            "controller_id": d.controller_id,
            "decision_type": d.decision_type.upper(),
            "override_action": d.override_action,
            "timestamp": d.timestamp.isoformat(),
            "recommendation": rec_data,
            "conflict": {
                "conflict_id": conflict.conflict_id,
                "resource_id": conflict.resource_id,
                "trains": [conflict.train_a_id, conflict.train_b_id],
                "status": conflict.status,
            } if conflict else None,
        })

    return audit_records
