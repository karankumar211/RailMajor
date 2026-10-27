"""RailOpt AI - REST API & WebSocket Integration Test Suite
Validates all endpoints and WebSocket functionality using FastAPI TestClient.
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_endpoints():
    print("=" * 64)
    print(" TESTING RAILOPT AI REST API & WEBSOCKET CONTRACT")
    print("=" * 64)

    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"
    print("[PASS] 1. GET /health -> 200 OK")

    # 2. Section state
    res = client.get("/api/v1/section/default/state")
    assert res.status_code == 200
    state_data = res.json()
    assert "trains" in state_data
    assert "resources" in state_data
    assert "occupancy" in state_data
    assert len(state_data["trains"]) > 0
    assert len(state_data["resources"]) > 0
    print(f"[PASS] 2. GET /api/v1/section/default/state -> 200 OK ({len(state_data['trains'])} trains, {len(state_data['resources'])} resources)")

    # 3. Active conflicts
    res = client.get("/api/v1/section/default/conflicts")
    assert res.status_code == 200
    conflicts_data = res.json()
    assert len(conflicts_data) > 0
    sample_conflict = conflicts_data[0]
    conflict_id = sample_conflict["conflict_id"]
    print(f"[PASS] 3. GET /api/v1/section/default/conflicts -> 200 OK ({len(conflicts_data)} open conflicts)")

    # 4. Conflict recommendations
    res = client.get(f"/api/v1/conflicts/{conflict_id}/recommendations")
    assert res.status_code == 200
    rec_data = res.json()
    assert rec_data["conflict_id"] == conflict_id
    assert len(rec_data["recommendations"]) > 0
    sample_rec = rec_data["recommendations"][0]
    rec_id = sample_rec["rec_id"]
    print(f"[PASS] 4. GET /api/v1/conflicts/{conflict_id}/recommendations -> 200 OK (Rank 1: {sample_rec['action_type']} on {sample_rec['target_train']})")

    # 5. Controller decision
    res = client.post(
        f"/api/v1/recommendations/{rec_id}/decision",
        json={
            "decision_type": "ACCEPT",
            "controller_id": "CTRL_NCR_TEST",
            "override_action": "Accepted AI recommendation without modification."
        }
    )
    assert res.status_code == 200
    dec_data = res.json()
    assert dec_data["status"] == "RECORDED"
    print(f"[PASS] 5. POST /api/v1/recommendations/{rec_id}/decision -> 200 OK (Decision ID: {dec_data['decision_id']})")

    # 6. What-if simulation
    res = client.post(
        "/api/v1/section/default/simulate",
        json={
            "conflict_id": conflict_id,
            "action_type": sample_rec["action_type"],
            "target_train": sample_rec["target_train"],
            "hold_minutes": sample_rec["hold_minutes"],
        }
    )
    assert res.status_code == 200
    sim_data = res.json()
    assert "projected_state" in sim_data
    assert "projected_delay_summary" in sim_data
    print(f"[PASS] 6. POST /api/v1/section/default/simulate -> 200 OK (Status: {sim_data['projected_delay_summary']['original_conflict_status']})")

    # 7. Audit log
    res = client.get("/api/v1/section/default/audit")
    assert res.status_code == 200
    audit_data = res.json()
    assert len(audit_data) > 0
    assert audit_data[0]["decision_type"] == "ACCEPT"
    print(f"[PASS] 7. GET /api/v1/section/default/audit -> 200 OK ({len(audit_data)} audit records)")

    # 8. Scenario reset
    res = client.post("/api/v1/scenarios", json={"seed": 42})
    assert res.status_code == 200
    scen_data = res.json()
    assert scen_data["status"] == "INITIALIZED"
    print(f"[PASS] 8. POST /api/v1/scenarios -> 200 OK (Scenario ID: {scen_data['scenario_id']})")

    # 9. WebSocket endpoint ping-pong
    with client.websocket_connect("/ws") as websocket:
        websocket.send_text("ping")
        data = websocket.receive_text()
        assert data == "pong"
    print("[PASS] 9. WS /ws -> Connection & Ping/Pong verified")

    print("=" * 64)
    print("[SUCCESS] All Module 5 API & WebSocket contracts verified!")
    print("=" * 64)

if __name__ == "__main__":
    test_api_endpoints()
