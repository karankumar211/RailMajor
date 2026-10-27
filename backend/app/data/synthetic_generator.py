"""RailOpt AI - Synthetic Digital Twin Data Generator
Generates a realistic Indian Railways division topology (stations, platforms,
block sections, junctions), trains across 4 priority tiers, schedules over
a 4-hour operating window, and initial live telemetry state.
"""
import random
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
from sqlalchemy.orm import Session
from app.database.db import Base, engine, SessionLocal
from app.database.models import (
    Station,
    Platform,
    BlockSection,
    Junction,
    Train,
    Schedule,
    TrainState,
    Conflict,
    Recommendation,
    ControllerDecision,
    DisruptionEvent,
)

# ==========================================
# Topology Specification: Delhi-Kanpur Main Trunk
# ==========================================

STATION_DATA = [
    {"id": "NDLS", "name": "New Delhi", "platforms": 4, "division": "DLI-DIV"},
    {"id": "GZB",  "name": "Ghaziabad Jn", "platforms": 4, "division": "DLI-DIV"},
    {"id": "ALJN", "name": "Aligarh Jn", "platforms": 3, "division": "PRYJ-DIV"},
    {"id": "HRS",  "name": "Hathras Jn", "platforms": 2, "division": "PRYJ-DIV"},
    {"id": "TDL",  "name": "Tundla Jn", "platforms": 4, "division": "PRYJ-DIV"},
    {"id": "FZD",  "name": "Firozabad", "platforms": 2, "division": "PRYJ-DIV"},
    {"id": "ETW",  "name": "Etawah Jn", "platforms": 3, "division": "PRYJ-DIV"},
    {"id": "PHD",  "name": "Phaphund", "platforms": 2, "division": "PRYJ-DIV"},
    {"id": "CNB",  "name": "Kanpur Central", "platforms": 4, "division": "PRYJ-DIV"},
    # Branch line terminals
    {"id": "MB",   "name": "Moradabad Jn", "platforms": 3, "division": "MB-DIV"},
    {"id": "AF",   "name": "Agra Fort", "platforms": 3, "division": "AGC-DIV"},
]

MAINLINE_PAIRS: List[Tuple[str, str, float]] = [
    ("NDLS", "GZB", 25.5),
    ("GZB", "ALJN", 106.0),
    ("ALJN", "HRS", 35.0),
    ("HRS", "TDL", 42.0),
    ("TDL", "FZD", 17.0),
    ("FZD", "ETW", 74.5),
    ("ETW", "PHD", 56.0),
    ("PHD", "CNB", 83.0),
]

BRANCH_PAIRS: List[Tuple[str, str, float]] = [
    ("GZB", "MB", 140.0),
    ("TDL", "AF", 23.0),
]

# Trains specification (20 trains)
TRAIN_TEMPLATES = [
    # Tier 1: Rajdhani / Vande Bharat (Priority 1)
    {"id": "TR_12423", "num": "12423", "name": "Dibrugarh Rajdhani", "class": "Rajdhani", "dir": "DOWN", "speed": 130.0, "route_type": "mainline"},
    {"id": "TR_12424", "num": "12424", "name": "Rajdhani Express", "class": "Rajdhani", "dir": "UP", "speed": 130.0, "route_type": "mainline"},
    {"id": "TR_22436", "num": "22436", "name": "Vande Bharat Express", "class": "Rajdhani", "dir": "DOWN", "speed": 130.0, "route_type": "mainline"},
    {"id": "TR_22435", "num": "22435", "name": "Vande Bharat Express", "class": "Rajdhani", "dir": "UP", "speed": 130.0, "route_type": "mainline"},

    # Tier 2: Express / Superfast (Priority 2)
    {"id": "TR_12397", "num": "12397", "name": "Mahabodhi Express", "class": "Express", "dir": "DOWN", "speed": 110.0, "route_type": "mainline"},
    {"id": "TR_12398", "num": "12398", "name": "Mahabodhi Express", "class": "Express", "dir": "UP", "speed": 110.0, "route_type": "mainline"},
    {"id": "TR_12801", "num": "12801", "name": "Purushottam Express", "class": "Express", "dir": "DOWN", "speed": 110.0, "route_type": "mainline"},
    {"id": "TR_12802", "num": "12802", "name": "Purushottam Express", "class": "Express", "dir": "UP", "speed": 110.0, "route_type": "mainline"},
    {"id": "TR_12565", "num": "12565", "name": "Bihar Sampark Kranti", "class": "Express", "dir": "DOWN", "speed": 110.0, "route_type": "mainline"},
    {"id": "TR_12566", "num": "12566", "name": "Bihar Sampark Kranti", "class": "Express", "dir": "UP", "speed": 110.0, "route_type": "mainline"},
    {"id": "TR_12553", "num": "12553", "name": "Vaishali Express", "class": "Express", "dir": "DOWN", "speed": 110.0, "route_type": "branch_mb"},
    {"id": "TR_12554", "num": "12554", "name": "Vaishali Express", "class": "Express", "dir": "UP", "speed": 110.0, "route_type": "branch_af"},

    # Tier 3: Passenger / MEMU (Priority 3)
    {"id": "TR_04183", "num": "04183", "name": "TDL-DLI Shuttle", "class": "Passenger", "dir": "UP", "speed": 90.0, "route_type": "sub_tdl_dli"},
    {"id": "TR_04184", "num": "04184", "name": "DLI-TDL Shuttle", "class": "Passenger", "dir": "DOWN", "speed": 90.0, "route_type": "sub_dli_tdl"},
    {"id": "TR_04159", "num": "04159", "name": "CNB-ETW MEMU", "class": "Passenger", "dir": "UP", "speed": 90.0, "route_type": "sub_cnb_etw"},
    {"id": "TR_04160", "num": "04160", "name": "ETW-CNB MEMU", "class": "Passenger", "dir": "DOWN", "speed": 90.0, "route_type": "sub_etw_cnb"},

    # Tier 4: Freight Rakes (Priority 4)
    {"id": "TR_BOXN_1", "num": "BOXN-8821", "name": "Thermal Coal Rake", "class": "Freight", "dir": "DOWN", "speed": 75.0, "route_type": "mainline"},
    {"id": "TR_BTPN_2", "num": "BTPN-4412", "name": "Petroleum Tanker", "class": "Freight", "dir": "UP", "speed": 75.0, "route_type": "mainline"},
    {"id": "TR_BCN_3",  "num": "BCN-9903",  "name": "Foodgrain Special", "class": "Freight", "dir": "DOWN", "speed": 75.0, "route_type": "mainline"},
    {"id": "TR_CONC_4", "num": "CONCOR-331", "name": "Container Freight", "class": "Freight", "dir": "UP", "speed": 80.0, "route_type": "mainline"},
]


def clear_database(db: Session):
    """Drop and recreate all database tables."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def generate_topology(db: Session, rng: random.Random) -> Dict[str, List]:
    """Generates stations, platforms, block sections, and junctions."""
    stations = []
    platforms = []
    block_sections = []
    junctions = []

    # 1. Create Stations & Platforms
    for s_info in STATION_DATA:
        st = Station(
            station_id=s_info["id"],
            name=s_info["name"],
            division_id=s_info["division"],
            platform_count=s_info["platforms"],
        )
        stations.append(st)
        db.add(st)

        # Create platforms (Platform 1 is main line, higher numbers can be loop lines)
        for p_idx in range(1, s_info["platforms"] + 1):
            is_loop = p_idx > 2  # Platforms 3+ are loop lines for overtakes/holds
            pf = Platform(
                platform_id=f"{s_info['id']}_PF_{p_idx}",
                station_id=s_info["id"],
                length_m=650.0 if not is_loop else 720.0,
                loop_line=is_loop,
                resource_id=f"{s_info['id']}_PF_{p_idx}",
                resource_type="platform",
            )
            platforms.append(pf)
            db.add(pf)

    # 2. Create Block Sections (Double Track Territory)
    # Mainline: DOWN line (NDLS -> CNB) and UP line (CNB -> NDLS)
    for from_st, to_st, dist in MAINLINE_PAIRS:
        # DOWN Line (Away from Delhi)
        blk_dn = BlockSection(
            block_id=f"BLK_{from_st}_{to_st}_DN",
            from_node=from_st,
            to_node=to_st,
            length_km=dist,
            max_speed_kmph=130.0,
            track_direction="DOWN",
            resource_id=f"BLK_{from_st}_{to_st}_DN",
            resource_type="block",
        )
        block_sections.append(blk_dn)
        db.add(blk_dn)

        # UP Line (Towards Delhi)
        blk_up = BlockSection(
            block_id=f"BLK_{to_st}_{from_st}_UP",
            from_node=to_st,
            to_node=from_st,
            length_km=dist,
            max_speed_kmph=130.0,
            track_direction="UP",
            resource_id=f"BLK_{to_st}_{from_st}_UP",
            resource_type="block",
        )
        block_sections.append(blk_up)
        db.add(blk_up)

    # Branch Lines
    for from_st, to_st, dist in BRANCH_PAIRS:
        blk_branch_dn = BlockSection(
            block_id=f"BLK_{from_st}_{to_st}_DN",
            from_node=from_st,
            to_node=to_st,
            length_km=dist,
            max_speed_kmph=100.0,
            track_direction="DOWN",
            resource_id=f"BLK_{from_st}_{to_st}_DN",
            resource_type="block",
        )
        block_sections.append(blk_branch_dn)
        db.add(blk_branch_dn)

        blk_branch_up = BlockSection(
            block_id=f"BLK_{to_st}_{from_st}_UP",
            from_node=to_st,
            to_node=from_st,
            length_km=dist,
            max_speed_kmph=100.0,
            track_direction="UP",
            resource_id=f"BLK_{to_st}_{from_st}_UP",
            resource_type="block",
        )
        block_sections.append(blk_branch_up)
        db.add(blk_branch_up)

    # 3. Create Junctions
    junc_gzb = Junction(
        junction_id="JNC_GZB",
        name="Ghaziabad Junction Triangle",
        connected_blocks=["BLK_NDLS_GZB_DN", "BLK_GZB_ALJN_DN", "BLK_GZB_MB_DN", "BLK_ALJN_GZB_UP", "BLK_MB_GZB_UP", "BLK_GZB_NDLS_UP"],
        resource_id="JNC_GZB",
        resource_type="junction",
    )
    junc_tdl = Junction(
        junction_id="JNC_TDL",
        name="Tundla Junction Interlocking",
        connected_blocks=["BLK_HRS_TDL_DN", "BLK_TDL_FZD_DN", "BLK_TDL_AF_DN", "BLK_FZD_TDL_UP", "BLK_AF_TDL_UP", "BLK_TDL_HRS_UP"],
        resource_id="JNC_TDL",
        resource_type="junction",
    )
    junctions.extend([junc_gzb, junc_tdl])
    db.add(junc_gzb)
    db.add(junc_tdl)

    db.flush()
    return {
        "stations": stations,
        "platforms": platforms,
        "blocks": block_sections,
        "junctions": junctions,
    }


def get_station_sequence(route_type: str, direction: str) -> List[str]:
    """Returns ordered sequence of stations for a given route and direction."""
    main_line = ["NDLS", "GZB", "ALJN", "HRS", "TDL", "FZD", "ETW", "PHD", "CNB"]
    
    if route_type == "mainline":
        seq = list(main_line)
    elif route_type == "branch_mb":
        seq = ["NDLS", "GZB", "MB"] if direction == "DOWN" else ["MB", "GZB", "NDLS"]
        return seq
    elif route_type == "branch_af":
        seq = ["CNB", "PHD", "ETW", "FZD", "TDL", "AF"] if direction == "UP" else ["AF", "TDL", "FZD", "ETW", "PHD", "CNB"]
        return seq
    elif route_type == "sub_tdl_dli":
        seq = ["TDL", "HRS", "ALJN", "GZB", "NDLS"]
    elif route_type == "sub_dli_tdl":
        seq = ["NDLS", "GZB", "ALJN", "HRS", "TDL"]
    elif route_type == "sub_cnb_etw":
        seq = ["CNB", "PHD", "ETW"]
    elif route_type == "sub_etw_cnb":
        seq = ["ETW", "PHD", "CNB"]
    else:
        seq = list(main_line)

    if direction == "UP" and route_type == "mainline":
        seq.reverse()

    return seq


def generate_trains_and_schedules(
    db: Session,
    topology: Dict[str, List],
    base_time: datetime,
    rng: random.Random
) -> Tuple[List[Train], List[Schedule], List[TrainState]]:
    """Generates trains, timetables across 4 hours, and initial telemetry states."""
    trains = []
    schedules = []
    states = []

    # Map block sections for fast lookup
    block_map: Dict[Tuple[str, str], BlockSection] = {}
    for b in topology["blocks"]:
        block_map[(b.from_node, b.to_node)] = b

    # Map station platforms
    st_pf_map: Dict[str, List[Platform]] = {}
    for pf in topology["platforms"]:
        st_pf_map.setdefault(pf.station_id, []).append(pf)

    # Offset departure starts staggered within the 4-hour window
    for idx, tmpl in enumerate(TRAIN_TEMPLATES):
        tr = Train(
            train_id=tmpl["id"],
            train_number=tmpl["num"],
            name=tmpl["name"],
            priority_class=tmpl["class"],
            direction=tmpl["dir"],
            max_speed_kmph=tmpl["speed"],
        )
        trains.append(tr)
        db.add(tr)

        station_seq = get_station_sequence(tmpl["route_type"], tmpl["dir"])
        
        # Start time staggered over first 90 minutes
        start_offset_mins = (idx * 5) % 95
        curr_time = base_time + timedelta(minutes=start_offset_mins)

        seq_order = 1
        curr_resource_for_state = None

        for s_idx, st_id in enumerate(station_seq):
            # Select platform (prefer main platform for Rajdhani/Express, loop line for Freight)
            pfs = st_pf_map.get(st_id, [])
            if tmpl["class"] == "Freight":
                # Prefer loop line if available
                loop_pfs = [p for p in pfs if p.loop_line]
                selected_pf = loop_pfs[0] if loop_pfs else pfs[0]
            elif tmpl["class"] == "Rajdhani":
                # Major platform 1 or 2
                selected_pf = pfs[0]
            else:
                selected_pf = pfs[s_idx % len(pfs)]

            # Dwell time
            if s_idx == 0:
                dwell_mins = 0
            elif s_idx == len(station_seq) - 1:
                dwell_mins = 10
            else:
                if tmpl["class"] == "Rajdhani":
                    dwell_mins = 2 if st_id in ["GZB", "TDL", "CNB"] else 0
                elif tmpl["class"] == "Express":
                    dwell_mins = 3 if st_id in ["GZB", "ALJN", "TDL", "ETW", "CNB"] else 1
                elif tmpl["class"] == "Passenger":
                    dwell_mins = 2
                else:  # Freight
                    dwell_mins = 5 if selected_pf.loop_line else 0

            arrival_time = curr_time
            departure_time = arrival_time + timedelta(minutes=dwell_mins)

            # Schedule at Platform
            sch_pf = Schedule(
                schedule_id=f"SCH_{tmpl['id']}_{seq_order}",
                train_id=tmpl["id"],
                resource_id=selected_pf.platform_id,
                resource_type="platform",
                sequence_order=seq_order,
                planned_arrival=arrival_time,
                planned_departure=departure_time,
            )
            schedules.append(sch_pf)
            db.add(sch_pf)
            seq_order += 1

            if curr_resource_for_state is None and arrival_time <= base_time + timedelta(minutes=45) <= departure_time:
                curr_resource_for_state = selected_pf.platform_id

            curr_time = departure_time

            # Schedule across connecting block section if not terminal station
            if s_idx < len(station_seq) - 1:
                next_st = station_seq[s_idx + 1]
                blk = block_map.get((st_id, next_st))
                if blk:
                    # Transit time = (dist / speed) * 60
                    effective_speed = min(tmpl["speed"], blk.max_speed_kmph) * 0.85  # Realistic average acceleration/braking
                    transit_mins = max(4.0, (blk.length_km / effective_speed) * 60.0)

                    block_entry = curr_time
                    block_exit = block_entry + timedelta(minutes=round(transit_mins, 1))

                    sch_blk = Schedule(
                        schedule_id=f"SCH_{tmpl['id']}_{seq_order}",
                        train_id=tmpl["id"],
                        resource_id=blk.block_id,
                        resource_type="block",
                        sequence_order=seq_order,
                        planned_arrival=block_entry,
                        planned_departure=block_exit,
                    )
                    schedules.append(sch_blk)
                    db.add(sch_blk)
                    seq_order += 1

                    if curr_resource_for_state is None and block_entry <= base_time + timedelta(minutes=45) <= block_exit:
                        curr_resource_for_state = blk.block_id

                    curr_time = block_exit

        # Initial Live TrainState (Simulated current time: base_time + 45 min)
        # Inject realistic delays into specific trains to seed interesting conflicts
        injected_delay = 0.0
        if tmpl["id"] == "TR_BOXN_1":
            injected_delay = 24.0  # Slow freight delayed ahead of Express
        elif tmpl["id"] == "TR_12553":
            injected_delay = 18.0  # Express running behind schedule
        elif tmpl["id"] == "TR_04184":
            injected_delay = 12.0  # Passenger shuttle late
        elif rng.random() < 0.25:
            injected_delay = float(rng.randint(5, 15))

        default_resource = station_seq[0] + "_PF_1" if not curr_resource_for_state else curr_resource_for_state
        state = TrainState(
            train_id=tmpl["id"],
            timestamp=base_time + timedelta(minutes=45),
            current_resource_id=default_resource,
            current_resource_type="block" if default_resource.startswith("BLK_") else "platform",
            delay_minutes=injected_delay,
            current_speed_kmph=tmpl["speed"] if default_resource.startswith("BLK_") else 0.0,
        )
        states.append(state)
        db.add(state)

    db.flush()
    return trains, schedules, states


def generate_scenario(seed: int = 42) -> Dict[str, int]:
    """Clears and deterministically repopulates the SQLite database for a given seed.
    Returns a dictionary of entity counts.
    """
    rng = random.Random(seed)
    db = SessionLocal()

    try:
        # 1. Clear database
        clear_database(db)

        # 2. Base simulation timeline: 4-hour window today
        now = datetime.now()
        base_time = datetime(now.year, now.month, now.day, 8, 0, 0)

        # 3. Create Infrastructure Topology
        topology = generate_topology(db, rng)

        # 4. Generate Trains, Schedules, and Live States
        trains, schedules, states = generate_trains_and_schedules(db, topology, base_time, rng)

        # 5. Seed one initial DisruptionEvent (e.g. low visibility/fog speed restriction on mainline block)
        disruption = DisruptionEvent(
            event_id="EVT_WEATHER_01",
            type="fog_visibility_drop",
            affected_resource_id="BLK_ALJN_HRS_DN",
            affected_resource_type="block",
            start_time=base_time + timedelta(minutes=30),
            end_time=base_time + timedelta(hours=3),
            severity="moderate",
        )
        db.add(disruption)

        db.commit()

        return {
            "stations": len(topology["stations"]),
            "platforms": len(topology["platforms"]),
            "block_sections": len(topology["blocks"]),
            "junctions": len(topology["junctions"]),
            "trains": len(trains),
            "schedules": len(schedules),
            "train_states": len(states),
            "disruptions": 1,
            "seed": seed,
        }
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
