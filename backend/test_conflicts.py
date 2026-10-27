"""RailOpt AI - Test Conflict Detection Idempotency & Graph Structure"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database.db import SessionLocal
from app.database.models import Conflict
from app.services.conflict_detection import detect_conflicts, build_conflict_graph
from app.services.digital_twin import get_section_state

def test_conflict_detection():
    db = SessionLocal()
    try:
        # First call
        conflicts_run_1 = detect_conflicts(db)
        count_1 = db.query(Conflict).count()

        # Second call immediately after (must be idempotent - no duplicates)
        conflicts_run_2 = detect_conflicts(db)
        count_2 = db.query(Conflict).count()

        assert count_1 == count_2, f"Idempotency failed: {count_1} != {count_2}"
        print(f"[PASS] Idempotency verified: Both runs produced exactly {count_1} conflicts without duplicates.")

        # Test Digital Twin state
        state = get_section_state(db)
        assert len(state["trains"]) > 0, "No trains returned in section state"
        print(f"[PASS] Digital twin state verified: {len(state['trains'])} trains tracked.")

        # Test NetworkX graph
        G = build_conflict_graph(db, conflicts_run_2)
        assert G.number_of_nodes() > 0
        assert G.number_of_edges() > 0
        print(f"[PASS] NetworkX conflict graph verified: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges.")
        
        # Check an edge attribute
        edge = list(G.edges(data=True))[0]
        print(f"[PASS] Sample Graph Edge: {edge[0]} <-> {edge[1]} on {edge[2]['resource_id']} ({edge[2]['duration_minutes']:.1f}m overlap)")

    finally:
        db.close()

if __name__ == "__main__":
    test_conflict_detection()
