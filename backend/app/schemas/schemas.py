"""RailOpt AI - Pydantic v2 Schemas for REST API requests and responses"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class DecisionRequest(BaseModel):
    decision_type: str = Field(..., description="ACCEPT | OVERRIDE | MODIFY")
    controller_id: str = Field(default="CTRL_NCR_01", description="Identifier of the human dispatcher")
    override_action: Optional[str] = Field(default=None, description="Custom action or notes if overridden/modified")

class DecisionResponse(BaseModel):
    decision_id: str
    status: str
    rec_id: str
    decision_type: str

class SimulateRequest(BaseModel):
    conflict_id: Optional[str] = None
    action_type: str = Field(..., description="HOLD_AT_LOOP | HOLD_BEFORE_BLOCK | PROCEED")
    target_train: str = Field(..., description="Train ID to apply action to")
    hold_minutes: int = Field(..., ge=0, description="Duration in minutes to hold the train")

class ScenarioRequest(BaseModel):
    seed: int = Field(default=42, description="Random seed for deterministic generation")

class ScenarioResponse(BaseModel):
    scenario_id: str
    status: str
    stats: Dict[str, Any]

# ==========================================
# Authentication & User Schemas
# ==========================================

class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64, description="Unique controller username")
    password: str = Field(..., min_length=4, description="Plaintext password to hash")
    role: Optional[str] = Field(default="controller", description="Role: controller | admin")

class UserLoginRequest(BaseModel):
    username: str = Field(..., description="Controller username")
    password: str = Field(..., description="Password")

class UserResponse(BaseModel):
    user_id: str
    username: str
    role: str
    created_at: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
