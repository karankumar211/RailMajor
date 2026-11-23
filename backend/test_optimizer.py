"""RailOpt AI - Test Optimization Engine v1"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database.db import SessionLocal
from app.database.models import Conflict, Recommendation, Train
from app.services.optimizer import resolve_conflict, resolve_all_open_conflicts, PRIORITY_CLASS_RANKING

def test_optimizer():
    db = SessionLocal()
    try:
        # Fetch an open conflict
        conflict = db.query(Conflict).filter(Conflict.status == "OPEN").first()
        assert conflict is not None, "No open conflicts found to test optimizer"

        # 1. Test single conflict resolution
        res = resolve_conflict(db, conflict)
        assert res["conflict_id"] == conflict.conflict_id
        assert len(res["recommendations"]) >= 1

        rec1 = res["recommendations"][0]
        assert rec1["rank"] == 1
        assert rec1["action_type"] in ["HOLD_AT_LOOP", "HOLD_BEFORE_BLOCK"]
        assert rec1["hold_minutes"] > 0
        assert "minimiz" in rec1["rationale"].lower()
        assert len(rec1["projected_delay_delta_minutes"]) == 2

        print(f"[PASS] Single conflict resolution verified:")
        print(f"       Conflict: {res['conflict_id']}")
        print(f"       Resource: {res['resource_id']}")
        print(f"       Action  : {rec1['action_type']} on {rec1['target_train']} for {rec1['hold_minutes']} mins")
        print(f"       Rationale: {rec1['rationale']}")
        print(f"       Deltas  : {rec1['projected_delay_delta_minutes']}")

        # 2. Test resolve_all_open_conflicts
        all_resolutions = resolve_all_open_conflicts(db)
        rec_count = db.query(Recommendation).count()
        assert rec_count >= len(all_resolutions), f"Expected at least {len(all_resolutions)} recommendations, got {rec_count}"

        print(f"[PASS] Resolved all {len(all_resolutions)} open conflicts. Total Recommendation rows in DB: {rec_count}")

    finally:
        db.close()

if __name__ == "__main__":
    test_optimizer()
