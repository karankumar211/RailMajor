# 🚆 RailOpt AI
### Next-Generation Railway Traffic Management & Dynamic Conflict Resolution Decision Support System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Redux Toolkit](https://img.shields.io/badge/Redux%20Toolkit-2.12-764ABC?style=flat&logo=redux&logoColor=white)](https://redux-toolkit.js.org/)
[![NetworkX](https://img.shields.io/badge/NetworkX-3.2-00599C?style=flat)](https://networkx.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📌 Overview

**RailOpt AI** is a real-time Decision Support System (DSS) engineered for railway network control rooms and dispatch controllers. Built to handle dense rail corridors, RailOpt AI ingests continuous track telemetry, detects topological and scheduling conflicts using directed graph analysis, computes optimized dispatch resolutions, and allows controllers to evaluate interventions via what-if simulations before committing changes.

### Key Capabilities

* **🌐 Module 1: Live Digital Twin & Telemetry**
  * Real-time schematic track diagrams with block sections, signals, stations, and platforms.
  * Live train telemetry tracking speed, delay, priority class (Rajdhani, Express, Freight), and resource occupancy.
* **⚡ Module 2: Graph-Based Conflict Detection (NetworkX)**
  * Topological resource contention detection (same block, converging junctions, head-to-head collisions).
  * Dynamic headway violations and station platform dwell conflicts.
* **🧠 Module 3: Intelligent Optimization Engine**
  * Automated resolution generator ranking interventions by passenger delay minimization and priority rules.
  * Human-in-the-loop workflow: Dispatchers can **ACCEPT**, **OVERRIDE**, or **MODIFY** recommendations.
* **🧪 Module 4: What-If Simulation Engine**
  * Multi-agent deterministic simulation allowing dispatchers to test speed restrictions, holds, and platform rerouting.
  * Visual side-by-side impact comparison (knock-on delays, throughput index).
* **📜 Immutable Audit Log & Export**
  * Regulatory-grade tamper-evident audit trail recording every dispatcher decision.
  * Instant CSV export and session playback.
* **📡 Real-Time WebSocket Broadcasting**
  * Low-latency bidirectional socket layer pushing events (`conflict.created`, `recommendation.ready`, `decision.recorded`) to all active control room consoles.

---

## 🏗️ Architecture & Project Structure

```text
railopt-ai/
├── backend/
│   ├── app/
│   │   ├── auth/                 # JWT token generation, password hashing & dependencies
│   │   ├── config.py             # Pydantic environment settings
│   │   ├── data/                 # Synthetic high-density rail corridor generator
│   │   ├── database/             # SQLAlchemy ORM models and session factories
│   │   ├── middlewares/          # Request audit logging and global error handling
│   │   ├── routes/               # FastAPI route modules (auth, section, conflict, scenarios)
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── services/             # Core engines: digital twin, conflict detection, optimizer, simulation
│   │   ├── sockets/              # WebSocket connection manager
│   │   └── main.py               # FastAPI application entrypoint
│   ├── seed.py                   # Deterministic database seeding & end-to-end verification
│   ├── test_api.py               # REST API & WebSocket contract test suite
│   ├── test_conflicts.py         # NetworkX conflict detection unit tests
│   ├── test_optimizer.py         # Optimization heuristic validation tests
│   ├── test_simulation.py        # What-if simulation engine tests
│   ├── requirements.txt          # Python dependencies
│   └── .env.example              # Backend environment template
│
├── frontend/
│   ├── public/                   # Static icons and assets
│   ├── src/
│   │   ├── components/           # Reusable UI controls (Buttons, Badges, Modals, Panels)
│   │   ├── features/             # Redux slices, RTK Query API endpoints, Digital Twin components
│   │   ├── lib/                  # WebSocket listener hooks and formatters
│   │   ├── pages/                # Operational console views:
│   │   │   ├── DashboardPage.jsx # Master Digital Twin & live section overview
│   │   │   ├── ConflictsPage.jsx # AI Recommendations & Decision Resolution queue
│   │   │   ├── SimulationPage.jsx# What-If scenario playground
│   │   │   ├── AuditPage.jsx     # Controller decision compliance history
│   │   │   ├── LoginPage.jsx     # Dispatcher credential authentication
│   │   │   └── RegisterPage.jsx  # New controller provisioning
│   │   ├── App.jsx               # Navigation shell and route guards
│   │   ├── main.jsx              # Application bootstrap & Redux store provider
│   │   └── index.css             # High-contrast industrial dark mode design system
│   ├── package.json              # Frontend scripts and NPM dependencies
│   ├── vite.config.js            # Vite configuration
│   └── .env.example              # Frontend environment template
│
├── .gitignore                    # Universal repository ignore rules
└── README.md                     # Documentation & setup guide
```

---

## ⚙️ Prerequisites

Before getting started, ensure you have the following installed on your machine:

1. **Python 3.10+** (verified up to 3.14): `python --version`
2. **Node.js 18+** & **npm 9+**: `node -v` and `npm -v`
3. **Git**: `git --version`

---

## 🚀 Quickstart: Clone & Run

### 1. Clone the Repository

```bash
git clone https://github.com/karankumar211/RailMajor.git
cd RailMajor
```

---

### 2. Backend Setup & Startup

Open a terminal in the project root:

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create a virtual environment
# Windows (PowerShell / Command Prompt):
python -m venv venv

# macOS / Linux:
python3 -m venv venv

# 3. Activate the virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (Command Prompt):
.\venv\Scripts\activate.bat
# macOS / Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Set up environment variables (Optional - defaults work out-of-the-box)
# Windows:
copy .env.example .env
# macOS / Linux:
cp .env.example .env

# 6. Initialize & seed the SQLite database with high-density scenario data
python seed.py

# 7. Start the FastAPI backend server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend server is now live at **`http://localhost:8000`**.

#### 🔍 Verification Links:
* **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
* **Interactive API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc Specification**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### 3. Frontend Setup & Startup

Open a **new terminal window** in the project root:

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Set up environment variables (Optional - defaults to localhost:8000)
# Windows:
copy .env.example .env
# macOS / Linux:
cp .env.example .env

# 4. Launch the Vite development server
npm run dev
```

The frontend console is now live at **`http://localhost:5173`**.

---

## 🔑 Default Dispatcher Credentials

When the database is seeded or the backend starts, a default dispatch controller account is automatically created:

| Field | Value | Role |
| :--- | :--- | :--- |
| **Username** | `controller` | Operations Dispatch Controller |
| **Password** | `control123` | Full access to dispatch & simulation |

> 💡 *New dispatch accounts can also be created anytime from the **Register** link on the login page.*

---

## 🧪 Running the Backend Test Suite

The backend includes comprehensive test suites covering REST APIs, WebSocket events, NetworkX conflict algorithms, and what-if simulations.

With your Python virtual environment activated inside `backend/`:

```bash
# Run all endpoint and contract tests
python test_api.py

# Run NetworkX conflict detection validation
python test_conflicts.py

# Run optimization heuristic validation
python test_optimizer.py

# Run what-if scenario simulation tests
python test_simulation.py
```

---

## 🌐 Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PROJECT_NAME` | `RailOpt AI` | Title displayed in API documentation |
| `VERSION` | `0.1.0` | Application release version |
| `API_V1_STR` | `/api/v1` | Base prefix for all REST endpoints |
| `DATABASE_URL` | `sqlite:///./railopt.db` | SQLAlchemy database connection URI |
| `JWT_SECRET` | `railopt-ai-secret-control-room-ops-key...` | Cryptographic secret for signing tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` (24h) | JWT session validity duration |

### Frontend (`frontend/.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:8000/api/v1` | URL of the backend REST API |
| `VITE_WS_URL` | `ws://localhost:8000/ws` | URL for real-time WebSocket telemetry |

---

## 🛠️ Preparing & Pushing to GitHub

Follow these steps to push this project cleanly to a new GitHub repository:

### Step 1: Create a New GitHub Repository
1. Go to [GitHub New Repository](https://github.com/new).
2. Enter a repository name (e.g., `railopt-ai`).
3. Leave **"Initialize this repository with a README"** unchecked (you already have this one).
4. Click **Create repository**.

### Step 2: Initialize Git in the Project Root

Open PowerShell or Command Prompt inside the `railopt-ai` directory:

```bash
cd "c:\Users\karan kumar\OneDrive\Desktop\rail\railopt-ai"

# Initialize local git repository
git init -b main

# Check that ignored files (node_modules, .db, __pycache__) are excluded
git status

# Stage all files
git add .

# Commit project files
git commit -m "feat: initial commit of RailOpt AI platform"

# Link your remote GitHub repository
git remote add origin https://github.com/karankumar211/RailMajor.git

# Push code to GitHub
git push -u origin main
```

> [!IMPORTANT]
> **Windows Git Note:** Make sure you execute `git init` directly inside the `railopt-ai` folder. Do not run `git add .` from your user home directory (`C:\Users\<username>`). The provided `.gitignore` in this repository automatically excludes local SQLite database files, compiled Python caches, and frontend `node_modules`.

---

## 👥 Contributors & Acknowledgements

* **Developed by**: RailOpt AI Engineering Team
* **Target Audience**: Railway Traffic Controllers, Operations Dispatchers, SIH Railway Infrastructure Challenges
* **License**: MIT
