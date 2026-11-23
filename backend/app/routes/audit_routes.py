"""RailOpt AI - Audit & Compliance Routes
Enterprise immutable regulatory ledger endpoints for dispatcher decision history,
compliance analytics, and streaming CSV export.
"""
import io
import csv
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database.db import get_db
from app.database.models import ControllerDecision, Recommendation, Conflict

router = APIRouter(prefix="/audit", tags=["Regulatory Audit"])

@router.get("/decisions")
def get_audit_decisions(
    decision_type: Optional[str] = Query(None, description="Filter: ACCEPT, OVERRIDE, MODIFY"),
    controller_id: Optional[str] = Query(None, description="Filter by controller username"),
    resource_id: Optional[str] = Query(None, description="Filter by conflicted resource ID"),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Returns paginated regulatory decision records eagerly joined in a single SQL query."""
    query = (
        db.query(ControllerDecision)
        .options(
            joinedload(ControllerDecision.recommendation)
            .joinedload(Recommendation.conflict)
        )
    )

    if decision_type:
        query = query.filter(func.lower(ControllerDecision.decision_type) == decision_type.lower())
    if controller_id:
        query = query.filter(ControllerDecision.controller_id == controller_id)

    total_count = query.count()
    decisions = query.order_by(ControllerDecision.timestamp.desc()).offset(offset).limit(limit).all()

    records = []
    for d in decisions:
        rec = d.recommendation
        conflict = rec.conflict if rec else None

        # Filter by resource_id if specified
        if resource_id and conflict and conflict.resource_id != resource_id:
            continue

        records.append({
            "decision_id": d.decision_id,
            "controller_id": d.controller_id,
            "decision_type": d.decision_type.upper(),
            "override_action": d.override_action,
            "timestamp": d.timestamp.isoformat(),
            "recommendation": {
                "rec_id": rec.rec_id,
                "action_type": rec.action_type,
                "target_train_id": rec.target_train_id,
                "hold_minutes": rec.hold_minutes,
                "projected_delay_delta": rec.projected_delay_delta or {},
                "rank": rec.rank,
                "rationale": rec.rationale,
            } if rec else None,
            "conflict": {
                "conflict_id": conflict.conflict_id,
                "resource_id": conflict.resource_id,
                "trains": [conflict.train_a_id, conflict.train_b_id],
                "status": conflict.status,
            } if conflict else None,
        })

    return {
        "total": total_count,
        "offset": offset,
        "limit": limit,
        "records": records,
    }


@router.get("/stats")
def get_audit_statistics(db: Session = Depends(get_db)):
    """Computes operational compliance, human-in-the-loop adherence index, and decision distribution."""
    decisions = db.query(ControllerDecision).options(joinedload(ControllerDecision.recommendation)).all()
    total = len(decisions)

    if total == 0:
        return {
            "total_decisions": 0,
            "acceptance_rate": 100.0,
            "override_rate": 0.0,
            "modification_rate": 0.0,
            "avg_hold_minutes": 0.0,
            "compliance_score": 100.0,
            "controllers_active": 0,
            "breakdown": {"accept": 0, "override": 0, "modify": 0},
        }

    counts = {"accept": 0, "override": 0, "modify": 0}
    controllers = set()
    total_hold_mins = 0
    hold_count = 0

    for d in decisions:
        dtype = (d.decision_type or "accept").lower()
        counts[dtype] = counts.get(dtype, 0) + 1
        controllers.add(d.controller_id)

        if d.recommendation and d.recommendation.hold_minutes:
            total_hold_mins += d.recommendation.hold_minutes
            hold_count += 1

    accept_rate = round((counts["accept"] / total) * 100, 1)
    override_rate = round((counts["override"] / total) * 100, 1)
    modify_rate = round((counts["modify"] / total) * 100, 1)
    avg_hold = round(total_hold_mins / hold_count, 1) if hold_count > 0 else 0.0

    # Compliance score: Weighted trust metric (Accept = 100%, Modify = 80%, Override = 60%)
    compliance = round(((counts["accept"] * 100 + counts["modify"] * 80 + counts["override"] * 60) / (total * 100)) * 100, 1)

    return {
        "total_decisions": total,
        "acceptance_rate": accept_rate,
        "override_rate": override_rate,
        "modification_rate": modify_rate,
        "avg_hold_minutes": avg_hold,
        "compliance_score": compliance,
        "controllers_active": len(controllers),
        "breakdown": counts,
    }


@router.get("/export/csv")
def export_audit_csv(db: Session = Depends(get_db)):
    """Generates and streams an immutable RFC 4180 compliant CSV audit log for regulatory compliance."""
    decisions = (
        db.query(ControllerDecision)
        .options(
            joinedload(ControllerDecision.recommendation)
            .joinedload(Recommendation.conflict)
        )
        .order_by(ControllerDecision.timestamp.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Headers
    writer.writerow([
        "Decision_ID",
        "Timestamp_UTC",
        "Controller_ID",
        "Decision_Type",
        "Conflicted_Resource",
        "Target_Train",
        "Hold_Minutes",
        "Override_Justification",
        "AI_Rationale",
        "Parent_Conflict_ID",
    ])

    for d in decisions:
        rec = d.recommendation
        conflict = rec.conflict if rec else None

        writer.writerow([
            d.decision_id,
            d.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            d.controller_id,
            d.decision_type.upper(),
            conflict.resource_id if conflict else "N/A",
            rec.target_train_id if rec else "N/A",
            rec.hold_minutes if rec else 0,
            d.override_action or "",
            rec.rationale if rec else "",
            conflict.conflict_id if conflict else "N/A",
        ])

    output.seek(0)
    filename = f"railopt_regulatory_audit_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Cache-Control": "no-cache",
        },
    )
