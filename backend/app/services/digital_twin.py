"""RailOpt AI - Digital Twin Service
Provides real-time section state snapshots, train telemetry, and resource occupancy.
"""
from datetime import datetime
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from app.database.models import Train, Schedule, TrainState

def get_section_state(db: Session) -> Dict[str, Any]:
    """Returns the current state of the railway division:
    - All trains with their current resource, direction, priority, and delay.
    - If a train lacks a TrainState record, an initial TrainState is derived from its
      first Schedule entry.
    - Resource occupancy map.
    """
    trains = db.query(Train).all()
    train_states_payload: List[Dict[str, Any]] = []
    resource_occupancy: Dict[str, List[str]] = {}

    for train in trains:
        # Fetch latest state
        latest_state = (
            db.query(TrainState)
            .filter(TrainState.train_id == train.train_id)
            .order_by(TrainState.timestamp.desc())
            .first()
        )

        # If no TrainState exists yet, derive from first Schedule
        if not latest_state:
            first_schedule = (
                db.query(Schedule)
                .filter(Schedule.train_id == train.train_id)
                .order_by(Schedule.sequence_order.asc(), Schedule.planned_arrival.asc())
                .first()
            )

            if first_schedule:
                initial_resource = first_schedule.resource_id
                initial_type = first_schedule.resource_type
                initial_time = first_schedule.planned_arrival
            else:
                initial_resource = "STN_DEPOT"
                initial_type = "platform"
                initial_time = datetime.utcnow()

            latest_state = TrainState(
                train_id=train.train_id,
                timestamp=initial_time,
                current_resource_id=initial_resource,
                current_resource_type=initial_type,
                delay_minutes=0.0,
                current_speed_kmph=0.0,
            )
            db.add(latest_state)
            db.flush()

        res_id = latest_state.current_resource_id
        resource_occupancy.setdefault(res_id, []).append(train.train_id)

        delay = latest_state.delay_minutes
        train_states_payload.append({
            "train_id": train.train_id,
            "train_number": train.train_number,
            "name": train.name,
            "priority_class": train.priority_class,
            "direction": train.direction,
            "max_speed_kmph": train.max_speed_kmph,
            "current_resource_id": res_id,
            "current_resource_type": latest_state.current_resource_type,
            "delay_minutes": delay,
            "current_speed_kmph": latest_state.current_speed_kmph,
            "status": "ON-TIME" if delay <= 0 else f"+{delay:.1f}m late",
            "last_updated": latest_state.timestamp.isoformat() if latest_state.timestamp else None,
        })

    db.commit()

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "train_count": len(train_states_payload),
        "trains": train_states_payload,
        "resource_occupancy": resource_occupancy,
    }
