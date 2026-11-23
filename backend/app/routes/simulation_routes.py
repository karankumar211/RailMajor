"""RailOpt AI - Simulation / What-If Engine Routes
Provides pure in-memory deterministic simulation projections, knock-on delay analysis,
and side-by-side Pareto comparison for candidate dispatch decisions.
"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.schemas.schemas import SimulateRequest
from app.services.simulation import simulate_action

router = APIRouter(prefix="/simulations", tags=["What-If Simulations"])

@router.post("/what-if")
def run_what_if_simulation(
    req: SimulateRequest,
    db: Session = Depends(get_db),
):
    """Executes a pure in-memory What-If projection for a candidate dispatch action.
    Leaves the database completely untouched.
    """
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


@router.post("/compare")
def compare_dispatch_scenarios(
    conflict_id: str = Body(..., description="Conflict ID to evaluate"),
    actions: List[Dict[str, Any]] = Body(..., min_length=2, max_length=4, description="List of candidate actions to compare"),
    db: Session = Depends(get_db),
):
    """Compares 2 to 4 candidate dispatch actions side-by-side in terms of:
    - Net delay delta across all trains
    - Knock-on downstream conflict risk
    - Throughput efficiency score
    """
    comparisons = []
    for idx, act in enumerate(actions, 1):
        act_type = act.get("action_type", "HOLD_AT_LOOP")
        target_train = act.get("target_train")
        hold_minutes = act.get("hold_minutes", 0)

        try:
            sim = simulate_action(
                db=db,
                conflict_id=conflict_id,
                action_type=act_type,
                target_train=target_train,
                hold_minutes=hold_minutes,
            )

            total_added = sim.get("projected_delay_summary", {}).get("total_added_delay_minutes", hold_minutes)
            new_conflicts = len(sim.get("projected_delay_summary", {}).get("new_conflicts_introduced", []))
            resolved = sim.get("original_conflict_resolved", True)

            # Throughput score: 100 - (hold_minutes * 1.5 + new_conflicts * 25)
            efficiency_score = max(0, min(100, round(100 - (total_added * 1.5 + new_conflicts * 25), 1)))

            comparisons.append({
                "option_index": idx,
                "label": act.get("label", f"Option {idx}: {act_type} ({target_train})"),
                "action_type": act_type,
                "target_train": target_train,
                "hold_minutes": hold_minutes,
                "original_conflict_resolved": resolved,
                "total_delay_added_minutes": total_added,
                "new_conflicts_count": new_conflicts,
                "throughput_efficiency_score": efficiency_score,
                "recommendation_tier": "PREFERRED" if idx == 1 and resolved else "FEASIBLE" if resolved else "UNFAVORABLE",
            })
        except Exception as e:
            comparisons.append({
                "option_index": idx,
                "error": str(e),
                "throughput_efficiency_score": 0,
            })

    best_option = max(comparisons, key=lambda x: x.get("throughput_efficiency_score", 0)) if comparisons else None

    return {
        "conflict_id": conflict_id,
        "scenarios_evaluated": len(comparisons),
        "recommended_option": best_option,
        "comparison_results": comparisons,
    }
