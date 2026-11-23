import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Activity,
  AlertTriangle,
  Sliders,
  ClipboardList,
  RotateCcw,
  Radio,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { useLiveSocket } from './lib/useLiveSocket';
import { usePostScenarioMutation } from './features/api/apiSlice';
import { logout, selectCurrentUser } from './features/auth/authSlice';
import DashboardPage from './pages/DashboardPage.jsx';
import ConflictsPage from './pages/ConflictsPage.jsx';
import SimulationPage from './pages/SimulationPage.jsx';
import AuditPage from './pages/AuditPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import { Badge, Button, ProtectedRoute, ThemeToggle } from './components';

/**
 * ControlRoomShell: The persistent authenticated operational console layout.
 */
function ControlRoomShell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const { isConnected } = useLiveSocket();
  const [postScenario, { isLoading: isResetting }] = usePostScenarioMutation();
  const [currentTime, setCurrentTime] = useState(new Date().toTimeString().split(' ')[0]);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Live operational clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleResetScenario = async () => {
    try {
      await postScenario({ seed: 42 }).unwrap();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to reset scenario:', err);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Live twin', icon: Activity },
    { to: '/conflicts', label: 'Conflicts & dispatch', icon: AlertTriangle },
    { to: '/simulation', label: 'What-if simulation', icon: Sliders },
    { to: '/audit', label: 'Audit log', icon: ClipboardList },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* ========================================================= */}
      {/* Persistent Left Sidebar (Control Room Ops Style)          */}
      {/* ========================================================= */}
      <aside
        style={{
          width: '260px',
          backgroundColor: 'var(--shell-bg)',
          borderRight: '1px solid var(--shell-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Header Brand */}
        <div
          style={{
            padding: '16px 18px',
            borderBottom: '1px solid var(--shell-border)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div className="sidebar-header-text">
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '0.92rem',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--shell-text)',
              }}
            >
              RailOpt AI
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: 'var(--shell-text-muted)',
                marginTop: '2px',
              }}
            >
              Dispatch control room
            </p>
          </div>
        </div>

        {/* Authenticated Controller Profile Card */}
        <div
          style={{
            padding: '10px 14px',
            margin: '10px 12px 0 12px',
            backgroundColor: 'var(--shell-panel)',
            border: '1px solid var(--shell-border)',
            borderRadius: 'var(--radius-panel)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                padding: '4px',
                borderRadius: 'var(--radius-sharp)',
                backgroundColor: 'rgba(217, 119, 6, 0.12)',
                border: '1px solid rgba(217, 119, 6, 0.4)',
              }}
            >
              <UserIcon size={13} color="var(--amber-text)" />
            </div>
            <div className="sidebar-full-label">
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: 'var(--shell-text)',
                }}
              >
                {currentUser?.username || 'CONTROLLER'}
              </div>
              <div
                style={{
                  fontSize: '0.6rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--shell-text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                {currentUser?.role || 'CONTROLLER'} - NCR
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log out of session"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--shell-text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 'var(--radius-sharp)',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--shell-text-muted)')}
          >
            <LogOut size={13} />
          </button>
        </div>

        {/* Navigation Section */}
        <div style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span
            className="sidebar-full-label"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem',
              color: 'var(--shell-text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '0 8px 6px 8px',
            }}
          >
            Operational Consoles
          </span>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  textDecoration: 'none',
                  borderRadius: 'var(--radius-control)',
                  border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                  borderLeft: isActive ? '2px solid var(--amber)' : '2px solid transparent',
                  backgroundColor: isActive ? 'var(--panel-active)' : 'transparent',
                  color: isActive ? 'var(--shell-text)' : 'var(--shell-text-muted)',
                  transition: 'background-color 150ms ease, color 150ms ease, border-color 150ms ease',
                })}
              >
                <Icon size={15} />
                <span
                  className="sidebar-full-label"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                  }}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Sidebar Telemetry & Actions */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--shell-border)',
            backgroundColor: 'var(--shell-panel)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* WebSocket Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={13} color={isConnected ? 'var(--green)' : 'var(--amber)'} />
              <span
                className="sidebar-full-label"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  color: isConnected ? 'var(--green)' : 'var(--amber)',
                }}
              >
                {isConnected ? 'Live feed' : 'Reconnecting'}
              </span>
            </div>
            <Badge variant={isConnected ? 'green' : 'amber'} size="sm" dot>
              {isConnected ? 'Synced' : 'Offline'}
            </Badge>
          </div>

          {/* Quick Reset Demo Scenario Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetScenario}
            disabled={isResetting}
            icon={<RotateCcw size={13} />}
            style={{ width: '100%' }}
          >
            <span className="sidebar-full-label">
              {isResetting ? 'Resetting...' : resetSuccess ? 'Reset OK' : 'Reset demo scenario'}
            </span>
          </Button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* Main Content Area & Ops Topbar                            */}
      {/* ========================================================= */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Ops Top Telemetry Bar */}
        <header
          style={{
            height: '48px',
            backgroundColor: 'var(--shell-bg)',
            borderBottom: '1px solid var(--shell-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            flexShrink: 0,
            color: 'var(--shell-text)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.8rem',
                color: 'var(--shell-text)',
                fontWeight: 500,
              }}
            >
              Delhi – Kanpur Mainline Corridor
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Theme Toggle Button */}
            <ThemeToggle size="sm" />

            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                fontWeight: 500,
                color: 'var(--shell-text)',
                backgroundColor: 'var(--shell-panel)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--shell-border)',
                fontFeatureSettings: 'tnum',
              }}
            >
              Ops time: {currentTime}
            </span>
          </div>
        </header>

        {/* Page Routing Views */}
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Terminals */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Guarded Operational Consoles */}
        <Route
          element={
            <ProtectedRoute>
              <ControlRoomShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/conflicts" element={<ConflictsPage />} />
          <Route path="/simulation" element={<SimulationPage />} />
          <Route path="/audit" element={<AuditPage />} />
        </Route>

        {/* Fallback to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
