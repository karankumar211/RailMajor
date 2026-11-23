import React from 'react';

/**
 * Control Room Action Button Component (Unslopped)
 * Clean controls, sentence case typography, purposeful transitions without bouncy scales.
 */
export function Button({
  children,
  onClick,
  variant = 'secondary', // 'primary' | 'secondary' | 'success' | 'danger' | 'amber'
  size = 'md',          // 'sm' | 'md' | 'lg'
  disabled = false,
  icon = null,
  style = {},
  type = 'button',
}) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isActive, setIsActive] = React.useState(false);

  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontFamily: 'var(--font-sans)',
    fontSize: size === 'sm' ? '0.74rem' : size === 'lg' ? '0.85rem' : '0.78rem',
    fontWeight: 500,
    letterSpacing: '0.01em',
    padding: size === 'sm' ? '4px 8px' : size === 'lg' ? '8px 16px' : '6px 12px',
    borderRadius: 'var(--radius-control)',
    border: '1px solid',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 100ms ease',
    outline: 'none',
  };

  const variantStyles = {
    primary: {
      backgroundColor: isHovered ? 'rgba(217, 119, 6, 0.2)' : 'rgba(217, 119, 6, 0.1)',
      borderColor: isHovered ? 'var(--amber)' : 'rgba(217, 119, 6, 0.4)',
      color: 'var(--amber-text)',
    },
    amber: {
      backgroundColor: isHovered ? 'rgba(217, 119, 6, 0.2)' : 'rgba(217, 119, 6, 0.1)',
      borderColor: isHovered ? 'var(--amber)' : 'rgba(217, 119, 6, 0.4)',
      color: 'var(--amber-text)',
    },
    success: {
      backgroundColor: isHovered ? 'rgba(22, 163, 74, 0.2)' : 'rgba(22, 163, 74, 0.1)',
      borderColor: isHovered ? 'var(--green)' : 'rgba(22, 163, 74, 0.4)',
      color: 'var(--green-text)',
    },
    danger: {
      backgroundColor: isHovered ? 'rgba(220, 38, 38, 0.2)' : 'rgba(220, 38, 38, 0.1)',
      borderColor: isHovered ? 'var(--red)' : 'rgba(220, 38, 38, 0.4)',
      color: 'var(--red-text)',
    },
    secondary: {
      backgroundColor: isHovered ? 'var(--panel-hover)' : 'var(--panel)',
      borderColor: isHovered ? 'var(--text-muted)' : 'var(--border)',
      color: isHovered ? 'var(--text)' : 'var(--text-muted)',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.secondary;

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      style={{
        ...baseStyles,
        ...currentVariant,
        transform: isActive && !disabled ? 'scale(0.99)' : 'none',
        ...style,
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

export default Button;
