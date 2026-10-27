import React from 'react';

/**
 * Control Room Signal Badge Component
 * Strictly functional railway signal colors: amber, red, green, blue, neutral.
 */
export function Badge({
  children,
  variant = 'neutral', // 'amber' | 'red' | 'green' | 'blue' | 'neutral'
  size = 'md',        // 'sm' | 'md'
  dot = false,
  style = {},
}) {
  const variantStyles = {
    amber: {
      color: 'var(--amber-text)',
      backgroundColor: 'rgba(217, 119, 6, 0.14)',
      borderColor: 'rgba(217, 119, 6, 0.38)',
    },
    red: {
      color: 'var(--red-text)',
      backgroundColor: 'rgba(220, 38, 38, 0.14)',
      borderColor: 'rgba(220, 38, 38, 0.38)',
    },
    green: {
      color: 'var(--green-text)',
      backgroundColor: 'rgba(22, 163, 74, 0.14)',
      borderColor: 'rgba(22, 163, 74, 0.38)',
    },
    blue: {
      color: 'var(--blue-text)',
      backgroundColor: 'rgba(37, 99, 235, 0.14)',
      borderColor: 'rgba(37, 99, 235, 0.38)',
    },
    neutral: {
      color: 'var(--text-muted)',
      backgroundColor: 'var(--chip-bg)',
      borderColor: 'var(--border)',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.neutral;
  const isSm = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: isSm ? '1px 6px' : '2px 8px',
        fontSize: isSm ? '0.65rem' : '0.72rem',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        letterSpacing: '0.04em',
        borderRadius: '6px',
        border: '1px solid',
        textTransform: 'uppercase',
        lineHeight: 1.3,
        ...currentVariant,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export default Badge;
