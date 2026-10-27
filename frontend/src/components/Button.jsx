import React from 'react';

/**
 * Control Room Action Button Component
 * Sharp edges, monospaced typography, functional hover/active states, no drop shadows.
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
    fontFamily: 'var(--font-mono)',
    fontSize: size === 'sm' ? '0.7rem' : size === 'lg' ? '0.85rem' : '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    padding: size === 'sm' ? '4px 10px' : size === 'lg' ? '10px 18px' : '6px 14px',
    borderRadius: 'var(--radius-sharp)',
    border: '1px solid',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'all 150ms ease',
    outline: 'none',
  };

  const variantStyles = {
    primary: {
      backgroundColor: isHovered ? 'rgba(217, 119, 6, 0.22)' : 'rgba(217, 119, 6, 0.12)',
      borderColor: isHovered ? 'var(--amber)' : 'rgba(217, 119, 6, 0.45)',
      color: 'var(--amber-text)',
    },
    amber: {
      backgroundColor: isHovered ? 'rgba(217, 119, 6, 0.22)' : 'rgba(217, 119, 6, 0.12)',
      borderColor: isHovered ? 'var(--amber)' : 'rgba(217, 119, 6, 0.45)',
      color: 'var(--amber-text)',
    },
    success: {
      backgroundColor: isHovered ? 'rgba(22, 163, 74, 0.22)' : 'rgba(22, 163, 74, 0.12)',
      borderColor: isHovered ? 'var(--green)' : 'rgba(22, 163, 74, 0.45)',
      color: 'var(--green-text)',
    },
    danger: {
      backgroundColor: isHovered ? 'rgba(220, 38, 38, 0.22)' : 'rgba(220, 38, 38, 0.12)',
      borderColor: isHovered ? 'var(--red)' : 'rgba(220, 38, 38, 0.45)',
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
        transform: isActive && !disabled ? 'scale(0.98)' : 'none',
        ...style,
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

export default Button;
