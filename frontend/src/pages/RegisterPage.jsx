import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { UserPlus, User as UserIcon, KeyRound, ShieldAlert, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import { useRegisterMutation } from '../features/api/apiSlice';
import { setCredentials } from '../features/auth/authSlice';
import { Panel, Badge, Button, ThemeToggle } from '../components';

export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [register, { isLoading }] = useRegisterMutation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('controller');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('Controller username is required.');
      return;
    }
    if (username.trim().length < 3) {
      setErrorMessage('Username must be at least 3 characters.');
      return;
    }
    if (!password || password.length < 4) {
      setErrorMessage('Password must be at least 4 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      const res = await register({
        username: username.trim(),
        password,
        role,
      }).unwrap();
      dispatch(setCredentials(res));
      navigate('/');
    } catch (err) {
      const detail = err?.data?.detail || 'Registration failed. Please try a different username.';
      setErrorMessage(detail);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
      }}
    >
      {/* Theme Toggle in Top Right */}
      <div style={{ position: 'absolute', top: '20px', right: '24px' }}>
        <ThemeToggle size="sm" />
      </div>

      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Terminal Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.5rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: 'var(--text)',
            }}
          >
            RAILOPT AI
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
              marginTop: '4px',
            }}
          >
            DISPATCH CONTROLLER REGISTRATION
          </p>
        </div>

        {/* Registration Panel */}
        <Panel
          title="REGISTER CONTROLLER"
          action={
            <Badge variant="blue" size="sm">
              NEW OFFICER
            </Badge>
          }
          style={{ borderTop: '3px solid var(--blue)' }}
        >
          {errorMessage && (
            <div
              style={{
                backgroundColor: 'rgba(229, 72, 77, 0.1)',
                border: '1px solid var(--red)',
                borderRadius: 'var(--radius-sharp)',
                padding: '10px 12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--red)',
              }}
            >
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <div>{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Username Input */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                  letterSpacing: '0.04em',
                }}
              >
                Desired Controller ID / Username:
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <UserIcon
                  size={14}
                  style={{ position: 'absolute', left: '10px', color: 'var(--text-dim)' }}
                />
                <input
                  type="text"
                  placeholder="e.g. rajesh_ctrl or priya_section"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sharp)',
                    color: 'var(--text)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    padding: '8px 10px 8px 32px',
                    outline: 'none',
                    transition: 'border-color 150ms ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            {/* Operational Role Select */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                  letterSpacing: '0.04em',
                }}
              >
                Operational Authorization Role:
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sharp)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  padding: '8px 10px',
                  outline: 'none',
                }}
              >
                <option value="controller">SECTION CONTROLLER (DISPATCH ADVISORY ACTIONS)</option>
                <option value="admin">CHIEF DISPATCHER / SYSTEM ADMIN</option>
              </select>
            </div>

            {/* Password Input */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                  letterSpacing: '0.04em',
                }}
              >
                Security Password:
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <KeyRound
                  size={14}
                  style={{ position: 'absolute', left: '10px', color: 'var(--text-dim)' }}
                />
                <input
                  type="password"
                  placeholder="Minimum 4 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sharp)',
                    color: 'var(--text)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    padding: '8px 10px 8px 32px',
                    outline: 'none',
                    transition: 'border-color 150ms ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                  letterSpacing: '0.04em',
                }}
              >
                Confirm Security Password:
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <KeyRound
                  size={14}
                  style={{ position: 'absolute', left: '10px', color: 'var(--text-dim)' }}
                />
                <input
                  type="password"
                  placeholder="Re-type password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sharp)',
                    color: 'var(--text)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    padding: '8px 10px 8px 32px',
                    outline: 'none',
                    transition: 'border-color 150ms ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              icon={<ArrowRight size={14} />}
              style={{ width: '100%', marginTop: '6px' }}
            >
              {isLoading ? 'ENROLLING OFFICER...' : 'ENROLL & INITIALIZE SESSION'}
            </Button>
          </form>

          {/* Navigation to Login */}
          <div
            style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border)',
              textAlign: 'center',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Already an enrolled officer?{' '}
            <Link
              to="/login"
              style={{
                color: 'var(--amber)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Operator Sign In &rarr;
            </Link>
          </div>
        </Panel>

        {/* Regulatory footer note */}
        <div
          style={{
            marginTop: '16px',
            textAlign: 'center',
            fontSize: '0.64rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-dim)',
          }}
        >
          INDIAN RAILWAYS TRAFFIC CONTROL SYSTEM &bull; STRICT AUDIT TRACEABILITY
        </div>
      </div>
    </div>
  );
}
