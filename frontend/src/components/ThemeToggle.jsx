import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * ThemeToggle Component
 * A modern, tactile dual-state Control Room switch toggle between Dark Mode and Light Mode.
 */
export function ThemeToggle({ size = 'md', showLabel = true, style = {} }) {
  const { theme, toggleTheme, isDark } = useTheme();

  const isSm = size === 'sm';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={toggleTheme}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleTheme();
        }
      }}
      aria-label={`Current theme is ${theme}. Click to switch to ${isDark ? 'light' : 'dark'} mode.`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode (currently ${theme.toUpperCase()})`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSm ? '6px' : '8px',
        padding: isSm ? '2px 8px 2px 4px' : '3px 10px 3px 5px',
        backgroundColor: 'var(--shell-panel, var(--panel))',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 180ms ease',
        boxShadow: isDark ? '0 1px 4px rgba(0, 0, 0, 0.4)' : '0 1px 3px rgba(0, 0, 0, 0.06)',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isDark ? 'var(--blue)' : 'var(--amber)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Sliding Dual Switch Capsule */}
      <div
        style={{
          position: 'relative',
          width: isSm ? '38px' : '44px',
          height: isSm ? '19px' : '22px',
          borderRadius: '12px',
          backgroundColor: isDark ? '#232731' : '#E2E8F0',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px',
          transition: 'background-color 220ms ease',
          boxSizing: 'border-box',
        }}
      >
        {/* Sun Icon on the left */}
        <Sun
          size={isSm ? 10 : 12}
          color={isDark ? 'var(--text-dim)' : '#D97706'}
          style={{ transition: 'color 200ms ease', zIndex: 1 }}
        />

        {/* Moon Icon on the right */}
        <Moon
          size={isSm ? 10 : 12}
          color={isDark ? '#60A5FA' : 'var(--text-dim)'}
          style={{ transition: 'color 200ms ease', zIndex: 1, transform: 'rotate(-10deg)' }}
        />

        {/* Sliding Thumb Indicator */}
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: isDark ? (isSm ? '20px' : '23px') : '2px',
            width: isSm ? '13px' : '16px',
            height: isSm ? '13px' : '16px',
            borderRadius: '50%',
            backgroundColor: isDark ? '#3B82F6' : '#FFFFFF',
            boxShadow: isDark
              ? '0 0 8px rgba(59, 130, 246, 0.7)'
              : '0 1px 3px rgba(0, 0, 0, 0.25)',
            transition: 'left 220ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms ease',
            zIndex: 2,
          }}
        />
      </div>

      {/* Mode Label */}
      {showLabel && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: isSm ? '0.66rem' : '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: 'var(--text)',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}
        >
          {isDark ? 'DARK' : 'LIGHT'}
        </span>
      )}
    </div>
  );
}

export default ThemeToggle;
