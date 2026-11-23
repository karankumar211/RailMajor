import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Lock, User as UserIcon, KeyRound, AlertTriangle, ArrowRight } from 'lucide-react';
import { useLoginMutation } from '../features/api/apiSlice';
import { setCredentials } from '../features/auth/authSlice';
import { Panel, Badge, Button, ThemeToggle } from '../components';

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    try {
      const res = await login({ username: username.trim(), password }).unwrap();
      dispatch(setCredentials(res));
      navigate('/');
    } catch (err) {
      const detail = err?.data?.detail || 'Authentication failed. Please verify credentials.';
      setErrorMessage(detail);
    }
  };

  const handleQuickFillDemo = () => {
    setUsername('controller');
    setPassword('control123');
    setErrorMessage('');
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
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.4rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--text)',
            }}
          >
            RailOpt AI
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginTop: '4px',
            }}
          >
            Dispatch controller access
          </p>
        </div>

        {/* Login Panel */}
        <Panel
          title="Operator sign in"
          action={
            <Badge variant="amber" size="sm" dot>
              NCR Division
            </Badge>
          }
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
                Controller Username / ID:
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <UserIcon
                  size={14}
                  style={{ position: 'absolute', left: '10px', color: 'var(--text-dim)' }}
                />
                <input
                  type="text"
                  placeholder="e.g. controller or chief_dispatcher"
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
                  onFocus={(e) => (e.target.style.borderColor = 'var(--amber)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
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
                  placeholder="Enter operator password"
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
                  onFocus={(e) => (e.target.style.borderColor = 'var(--amber)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="amber"
              disabled={isLoading}
              icon={<ArrowRight size={14} />}
              style={{ width: '100%', marginTop: '4px' }}
            >
              {isLoading ? 'VERIFYING CREDENTIALS...' : 'SIGN IN TO CONTROL ROOM'}
            </Button>

            {/* Quick Demo Autofill */}
            <div
              style={{
                marginTop: '10px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                DEFAULT DEMO SEED:
              </span>
              <button
                type="button"
                onClick={handleQuickFillDemo}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(217, 119, 6, 0.08)',
                  border: '1px solid rgba(217, 119, 6, 0.35)',
                  color: 'var(--amber-text)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                AUTOFILL DEMO CREDENTIALS
              </button>
            </div>
          </form>

          {/* Navigation to Register */}
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
            New dispatch officer?{' '}
            <Link
              to="/register"
              style={{
                color: 'var(--blue)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Register Controller ID &rarr;
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
          OFFICIAL USE ONLY &bull; STATUTORY SAFETY & AUDIT INTEGRITY RECORDED
        </div>
      </div>
    </div>
  );
}
