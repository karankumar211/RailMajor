"""RailOpt AI - Conflict Detection Service
Implements interval-overlap resource occupancy modeling and NetworkX-based
conflict graph construction for railway dispatching.
"""
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import networkx as nx
from sqlalchemy.orm import Session
from app.database.models import Schedule, Train, Conflict

def build_conflict_graph(
    db: Session,
    conflicts: Optional[List[Conflict]] = None
) -> nx.Graph:
    """Builds a NetworkX graph where:
    - Nodes = Trains (with priority, number, direction attributes)
    - Edges = Resource conflicts between train pairs with overlapping windows
    """
    if conflicts is None:
        conflicts = db.query(Conflict).filter(Conflict.status == "OPEN").all()

    G = nx.Graph()

    # Cache trains for node attributes
    train_records = {t.train_id: t for t in db.query(Train).all()}

    for c in conflicts:
        for t_id in (c.train_a_id, c.train_b_id):
            if not G.has_node(t_id):
                t_obj = train_records.get(t_id)
                G.add_node(
                    t_id,
                    train_number=t_obj.train_number if t_obj else t_id,
                    priority_class=t_obj.priority_class if t_obj else "Unknown",
                    direction=t_obj.direction if t_obj else "UNKNOWN",
                    name=t_obj.name if t_obj else t_id,
                )

        duration = (c.window_end - c.window_start).total_seconds() / 60.0
        G.add_edge(
            c.train_a_id,
            c.train_b_id,
            conflict_id=c.conflict_id,
            resource_id=c.resource_id,
            resource_type=c.resource_type,
            conflict_type=c.conflict_type,
            window_start=c.window_start,
            window_end=c.window_end,
            duration_minutes=duration,
        )

    return G


def classify_conflict_type(resource_type: str, train_a: Optional[Train], train_b: Optional[Train]) -> str:
    """Classifies operational conflict type based on resource and train directions."""
    if resource_type == "platform":
        return "platform_occupancy"
    elif resource_type == "junction":
        return "junction_crossing"
    elif resource_type == "block":
        if train_a and train_b and train_a.direction != train_b.direction:
            return "head_on"
        return "same_direction_headway"
    return "resource_overlap"


def detect_conflicts(db: Session) -> List[Conflict]:
    """Walks all schedules, groups by resource_id, determines overlapping time windows,
    and upserts Conflict records into the database with status='OPEN'.
    Prevents duplicates on repeated calls.
    Returns the list of detected open conflicts.
    """
    # 1. Fetch all schedules ordered by arrival time
    schedules = (
        db.query(Schedule)
        .order_by(Schedule.resource_id, Schedule.planned_arrival.asc())
        .all()
    )

    # Cache trains for fast metadata lookup
    trains_map = {t.train_id: t for t in db.query(Train).all()}

    # Group schedules by resource_id
    res_schedules: Dict[str, List[Schedule]] = {}
    for sch in schedules:
        res_schedules.setdefault(sch.resource_id, []).append(sch)

    detected_conflicts: List[Conflict] = []
    seen_keys = set()

    for resource_id, sch_list in res_schedules.items():
        if len(sch_list) < 2:
            continue

        n = len(sch_list)
        for i in range(n):
            s_i = sch_list[i]
            for j in range(i + 1, n):
                s_j = sch_list[j]

                # A train cannot conflict with itself
                if s_i.train_id == s_j.train_id:
                    continue

                # Check for interval overlap: max(arr1, arr2) < min(dep1, dep2)
                overlap_start = max(s_i.planned_arrival, s_j.planned_arrival)
                overlap_end = min(s_i.planned_departure, s_j.planned_departure)

                if overlap_start < overlap_end:
                    # Normalize train pair ordering
                    if s_i.train_id < s_j.train_id:
                        t_a_id, t_b_id = s_i.train_id, s_j.train_id
                    else:
                        t_a_id, t_b_id = s_j.train_id, s_i.train_id

                    # Unique conflict signature
                    key = (resource_id, t_a_id, t_b_id, overlap_start)
                    if key in seen_keys:
                        continue
                    seen_keys.add(key)

                    res_type = s_i.resource_type
                    c_type = classify_conflict_type(
                        res_type,
                        trains_map.get(t_a_id),
                        trains_map.get(t_b_id)
                    )

                    cid = f"CONF_{resource_id}_{t_a_id}_{t_b_id}_{overlap_start.strftime('%Y%m%d%H%M')}"

                    # Upsert check: query existing conflict
                    existing = (
                        db.query(Conflict)
                        .filter(
                            Conflict.resource_id == resource_id,
                            Conflict.train_a_id == t_a_id,
                            Conflict.train_b_id == t_b_id,
                            Conflict.window_start == overlap_start,
                        )
                        .first()
                    )

                    if existing:
                        # Update window_end if adjusted, keep existing status
                        existing.window_end = overlap_end
                        detected_conflicts.append(existing)
                    else:
                        new_conflict = Conflict(
                            conflict_id=cid,
                            resource_id=resource_id,
                            resource_type=res_type,
                            train_a_id=t_a_id,
                            train_b_id=t_b_id,
                            conflict_type=c_type,
                            window_start=overlap_start,
                            window_end=overlap_end,
                            status="OPEN",
                        )
                        db.add(new_conflict)
                        detected_conflicts.append(new_conflict)

    db.commit()
    return detected_conflicts
