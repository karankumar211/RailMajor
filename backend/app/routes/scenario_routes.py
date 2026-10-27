"""RailOpt AI - Scenario Management Routes
Provides deterministic scenario reset, conflict detection, and batch optimization.
"""
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.database.models import User
from app.schemas.schemas import ScenarioRequest, ScenarioResponse
from app.data.synthetic_generator import generate_scenario
from app.services.conflict_detection import detect_conflicts
from app.services.optimizer import resolve_all_open_conflicts
from app.sockets.ws_manager import ws_manager
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

@router.post("", response_model=ScenarioResponse)
async def create_or_reset_scenario(
    body: ScenarioRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Regenerates deterministic digital twin scenario, runs conflict detection,
    and solves all open conflicts. Broadcasts conflict.created events.
    """
    seed = body.seed
    scenario_id = f"SCEN_{seed}_{uuid.uuid4().hex[:8].upper()}"

    # 1. Regenerate digital twin
    counts = generate_scenario(seed=seed)

    # 2. Detect conflicts
    conflicts = detect_conflicts(db)

    # 3. Solve all conflicts
    resolutions = resolve_all_open_conflicts(db)

    # Broadcast conflict.created and scenario reset event
    await ws_manager.broadcast({
        "event": "conflict.created",
        "scenario_id": scenario_id,
        "conflict_count": len(conflicts),
        "seed": seed,
    })

    return ScenarioResponse(
        scenario_id=scenario_id,
        status="INITIALIZED",
        stats={
            "seed": seed,
            "trains": counts.get("trains", 0),
            "stations": counts.get("stations", 0),
            "platforms": counts.get("platforms", 0),
            "blocks": counts.get("block_sections", 0),
            "conflicts_detected": len(conflicts),
            "recommendations_stored": len(resolutions) * 2,
        },
    )
