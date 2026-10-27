"""RailOpt AI - SQLAlchemy ORM Models
Defines Digital Twin network topology, rolling stock, schedules, live state,
conflicts, recommendations, decisions, and disruptions.
"""
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship
from app.database.db import Base


# ==========================================
# Network Topology Models (Physical Infrastructure)
# ==========================================

class Station(Base):
    __tablename__ = "stations"

    station_id = Column(String(32), primary_key=True, index=True)  # e.g., "NDLS", "GZB"
    name = Column(String(128), nullable=False)
    division_id = Column(String(64), nullable=False, default="NCR-DLI")
    platform_count = Column(Integer, nullable=False, default=2)

    # Relationships
    platforms = relationship("Platform", back_populates="station", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Station(id='{self.station_id}', name='{self.name}', platforms={self.platform_count})>"


class Platform(Base):
    __tablename__ = "platforms"

    platform_id = Column(String(64), primary_key=True, index=True)  # e.g., "NDLS_PF_1"
    station_id = Column(String(32), ForeignKey("stations.station_id"), nullable=False, index=True)
    length_m = Column(Float, nullable=False, default=650.0)
    loop_line = Column(Boolean, nullable=False, default=False)
    
    # Unified Resource Discriminator
    resource_id = Column(String(64), nullable=False, index=True)
    resource_type = Column(String(32), nullable=False, default="platform")

    # Relationships
    station = relationship("Station", back_populates="platforms")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.resource_id:
            self.resource_id = self.platform_id
        self.resource_type = "platform"

    def __repr__(self):
        return f"<Platform(id='{self.platform_id}', station='{self.station_id}', loop={self.loop_line})>"


class BlockSection(Base):
    __tablename__ = "block_sections"

    block_id = Column(String(64), primary_key=True, index=True)  # e.g., "BLK_NDLS_GZB_DN"
    from_node = Column(String(64), nullable=False, index=True)   # Station or Junction ID
    to_node = Column(String(64), nullable=False, index=True)     # Station or Junction ID
    length_km = Column(Float, nullable=False)
    max_speed_kmph = Column(Float, nullable=False, default=110.0)
    track_direction = Column(String(16), nullable=False, default="BOTH")  # UP, DOWN, BOTH

    # Unified Resource Discriminator
    resource_id = Column(String(64), nullable=False, index=True)
    resource_type = Column(String(32), nullable=False, default="block")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.resource_id:
            self.resource_id = self.block_id
        self.resource_type = "block"

    def __repr__(self):
        return f"<BlockSection(id='{self.block_id}', {self.from_node}->{self.to_node}, {self.length_km}km)>"


class Junction(Base):
    __tablename__ = "junctions"

    junction_id = Column(String(64), primary_key=True, index=True)  # e.g., "JNC_GZB"
    name = Column(String(128), nullable=False)
    connected_blocks = Column(JSON, nullable=False, default=list)  # list of connected Block IDs

    # Unified Resource Discriminator
    resource_id = Column(String(64), nullable=False, index=True)
    resource_type = Column(String(32), nullable=False, default="junction")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.resource_id:
            self.resource_id = self.junction_id
        self.resource_type = "junction"

    def __repr__(self):
        return f"<Junction(id='{self.junction_id}', name='{self.name}')>"


# ==========================================
# Rolling Stock & Timetable Models
# ==========================================

class Train(Base):
    __tablename__ = "trains"

    train_id = Column(String(64), primary_key=True, index=True)    # e.g., "TR_12952"
    train_number = Column(String(32), nullable=False, index=True)  # e.g., "12952"
    name = Column(String(128), nullable=False)                     # e.g., "Mumbai Rajdhani"
    priority_class = Column(String(32), nullable=False)            # Rajdhani, Express, Passenger, Freight
    direction = Column(String(16), nullable=False)                 # UP, DOWN
    max_speed_kmph = Column(Float, nullable=False, default=110.0)

    # Relationships
    schedules = relationship("Schedule", back_populates="train", cascade="all, delete-orphan", order_by="Schedule.sequence_order")
    states = relationship("TrainState", back_populates="train", cascade="all, delete-orphan", order_by="TrainState.timestamp.desc()")

    def __repr__(self):
        return f"<Train(number='{self.train_number}', class='{self.priority_class}', dir='{self.direction}')>"


class Schedule(Base):
    __tablename__ = "schedules"

    schedule_id = Column(String(64), primary_key=True, index=True)
    train_id = Column(String(64), ForeignKey("trains.train_id"), nullable=False, index=True)
    resource_id = Column(String(64), nullable=False, index=True)
    resource_type = Column(String(32), nullable=False)  # platform, block, junction
    sequence_order = Column(Integer, nullable=False, default=1)
    planned_arrival = Column(DateTime, nullable=False)
    planned_departure = Column(DateTime, nullable=False)

    # Relationships
    train = relationship("Train", back_populates="schedules")

    def __repr__(self):
        return f"<Schedule(train='{self.train_id}', res='{self.resource_id}', arr={self.planned_arrival}, dep={self.planned_departure})>"


class TrainState(Base):
    """Dynamic twin telemetry snapshot for train position and delay."""
    __tablename__ = "train_states"

    id = Column(Integer, primary_key=True, autoincrement=True)
    train_id = Column(String(64), ForeignKey("trains.train_id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    current_resource_id = Column(String(64), nullable=False, index=True)
    current_resource_type = Column(String(32), nullable=False, default="block")
    delay_minutes = Column(Float, nullable=False, default=0.0)
    current_speed_kmph = Column(Float, nullable=False, default=0.0)

    # Relationships
    train = relationship("Train", back_populates="states")

    def __repr__(self):
        return f"<TrainState(train='{self.train_id}', res='{self.current_resource_id}', delay={self.delay_minutes}m)>"


# ==========================================
# Conflict, Recommendation & Decision Models
# ==========================================

class Conflict(Base):
    __tablename__ = "conflicts"

    conflict_id = Column(String(64), primary_key=True, index=True)
    resource_id = Column(String(64), nullable=False, index=True)
    resource_type = Column(String(32), nullable=False, default="block")  # platform, block, junction
    train_a_id = Column(String(64), ForeignKey("trains.train_id"), nullable=False)
    train_b_id = Column(String(64), ForeignKey("trains.train_id"), nullable=False)
    conflict_type = Column(String(32), nullable=False, default="same_direction")  # head_on, same_direction, platform_occupancy
    window_start = Column(DateTime, nullable=False)
    window_end = Column(DateTime, nullable=False)
    status = Column(String(32), nullable=False, default="OPEN")  # OPEN, RESOLVED, OVERRIDDEN

    # Relationships
    recommendations = relationship("Recommendation", back_populates="conflict", cascade="all, delete-orphan", order_by="Recommendation.rank")

    def __repr__(self):
        return f"<Conflict(id='{self.conflict_id}', res='{self.resource_id}', trains=({self.train_a_id}, {self.train_b_id}), status='{self.status}')>"


class Recommendation(Base):
    __tablename__ = "recommendations"

    rec_id = Column(String(64), primary_key=True, index=True)
    conflict_id = Column(String(64), ForeignKey("conflicts.conflict_id"), nullable=False, index=True)
    action_type = Column(String(32), nullable=False)  # hold, precede, reroute
    target_train_id = Column(String(64), nullable=True)  # The train being held or rerouted
    hold_minutes = Column(Integer, nullable=True, default=0)
    projected_delay_delta = Column(JSON, nullable=True, default=dict)
    rank = Column(Integer, nullable=False, default=1)
    rationale = Column(Text, nullable=False)
    generated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    conflict = relationship("Conflict", back_populates="recommendations")
    decisions = relationship("ControllerDecision", back_populates="recommendation", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Recommendation(id='{self.rec_id}', type='{self.action_type}', rank={self.rank})>"


class ControllerDecision(Base):
    """Immutable audit record of a human controller's response to an AI recommendation."""
    __tablename__ = "controller_decisions"

    decision_id = Column(String(64), primary_key=True, index=True)
    rec_id = Column(String(64), ForeignKey("recommendations.rec_id"), nullable=False, index=True)
    controller_id = Column(String(64), nullable=False)
    decision_type = Column(String(32), nullable=False)  # accept, override, modify
    override_action = Column(Text, nullable=True)        # reason/custom params if overridden or modified
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)  # Immutable

    # Relationships
    recommendation = relationship("Recommendation", back_populates="decisions")

    def __repr__(self):
        return f"<ControllerDecision(id='{self.decision_id}', type='{self.decision_type}', by='{self.controller_id}')>"


# ==========================================
# External Disruption Model
# ==========================================

class DisruptionEvent(Base):
    __tablename__ = "disruption_events"

    event_id = Column(String(64), primary_key=True, index=True)
    type = Column(String(64), nullable=False)  # weather, signal_failure, track_work, speed_restriction
    affected_resource_id = Column(String(64), nullable=False, index=True)
    affected_resource_type = Column(String(32), nullable=False, default="block")
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    severity = Column(String(32), nullable=False, default="moderate")  # minor, moderate, severe

    def __repr__(self):
        return f"<DisruptionEvent(id='{self.event_id}', type='{self.type}', res='{self.affected_resource_id}', sev='{self.severity}')>"


# ==========================================
# User & Authentication Model
# ==========================================

class User(Base):
    """User account model for dispatch controllers and administrators."""
    __tablename__ = "users"

    user_id = Column(String(64), primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="controller")  # "controller", "admin"
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f"<User(id='{self.user_id}', username='{self.username}', role='{self.role}')>"
