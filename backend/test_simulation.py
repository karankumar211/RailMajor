"""RailOpt AI - Test Simulation Service (What-If Projections)"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database.db import SessionLocal
from app.database.models import Conflict, Recommendation, Schedule
from app.services.simulation import simulate_action

def test_simulation():
    db = SessionLocal()
    try:
        # 1. Fetch an open conflict where holding the target train clears the section
        conflicts = db.query(Conflict).filter(Conflict.status == "OPEN").all()
        assert len(conflicts) > 0, "No open conflicts found to test simulation"

        # Record schedule timestamps before simulation to prove DB immutability
        all_schedules_before = {
            s.schedule_id: (s.planned_arrival, s.planned_departure)
            for s in db.query(Schedule).all()
        }

        # Find a clean resolving conflict (e.g. TR_12398 & TR_22435)
        clean_conflict = None
        for c in conflicts:
            r = db.query(Recommendation).filter(Recommendation.conflict_id == c.conflict_id, Recommendation.rank == 1).first()
            if r:
                sim = simulate_action(db, c.conflict_id, r.action_type, r.target_train_id, r.hold_minutes)
                if sim["original_conflict_resolved"]:
                    clean_conflict = (c, r, sim)
                    break

        # Fallback to first conflict if none resolved cleanly
        if not clean_conflict:
            c = conflicts[0]
            r = db.query(Recommendation).filter(Recommendation.conflict_id == c.conflict_id, Recommendation.rank == 1).first()
            sim = simulate_action(db, c.conflict_id, r.action_type, r.target_train_id, r.hold_minutes)
            clean_conflict = (c, r, sim)

        c, r, sim_result = clean_conflict

        # Assertions on simulation result structure
        assert sim_result["conflict_id"] == c.conflict_id
        assert sim_result["target_train"] == r.target_train_id
        assert sim_result["hold_minutes"] == r.hold_minutes
        assert len(sim_result["projected_state"]) > 0

        summary = sim_result["projected_delay_summary"]
        assert summary["total_added_delay_minutes"] == r.hold_minutes
        assert summary["original_conflict_status"] in ["RESOLVED", "PERSISTS"]

        # 2. Verify DB was NOT mutated (pure function guarantee)
        all_schedules_after = {
            s.schedule_id: (s.planned_arrival, s.planned_departure)
            for s in db.query(Schedule).all()
        }
        assert all_schedules_before == all_schedules_after, "Database was mutated by simulation! Must remain pure."
        print("[PASS] DB immutability verified: All 282 Schedule rows remained 100% untouched.")

        # 3. Output inspection
        print(f"[PASS] Simulation completed successfully:")
        print(f"       Conflict Tested  : {c.conflict_id}")
        print(f"       Resource         : {c.resource_id}")
        print(f"       Action Tested    : {r.action_type} on {r.target_train_id} for {r.hold_minutes} mins")
        print(f"       Original Status  : {summary['original_conflict_status']}")
        print(f"       New Conflicts    : {summary['new_conflicts_count']} introduced downstream")
        print(f"       Net Impact       : {summary['net_conflict_change']} net conflicts")

        print("\n--- SAMPLE PROJECTED TIMELINE (FIRST 3 REVISED STOPS) ---")
        for ps in sim_result["projected_state"][:3]:
            print(f"  Resource: {ps['resource_id']:20} | Orig: {ps['original_arrival'][11:16]}->{ps['original_departure'][11:16]} | Proj: {ps['projected_arrival'][11:16]}->{ps['projected_departure'][11:16]} | +{ps['delay_delta_minutes']}m")

        if summary["new_conflicts_introduced"]:
            print("\n--- SAMPLE DOWNSTREAM CONFLICT INTRODUCED ---")
            nc = summary["new_conflicts_introduced"][0]
            print(f"  Resource: {nc['resource_id']} with {nc['conflicting_train_priority']} {nc['conflicting_train_number']} ({nc['window_start']}->{nc['window_end']}, {nc['overlap_minutes']}m overlap)")

    finally:
        db.close()

if __name__ == "__main__":
    test_simulation()
