import React from 'react';

/**
 * Control Room Signal Badge Component (Unslopped)
 * Functional status tags with quiet hairlines and optional status dots.
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
      backgroundColor: 'rgba(217, 119, 6, 0.12)',
      borderColor: 'rgba(217, 119, 6, 0.3)',
      dotColor: 'var(--amber)',
    },
    red: {
      color: 'var(--red-text)',
      backgroundColor: 'rgba(220, 38, 38, 0.12)',
      borderColor: 'rgba(220, 38, 38, 0.3)',
      dotColor: 'var(--red)',
    },
    green: {
      color: 'var(--green-text)',
      backgroundColor: 'rgba(22, 163, 74, 0.12)',
      borderColor: 'rgba(22, 163, 74, 0.3)',
      dotColor: 'var(--green)',
    },
    blue: {
      color: 'var(--blue-text)',
      backgroundColor: 'rgba(37, 99, 235, 0.12)',
      borderColor: 'rgba(37, 99, 235, 0.3)',
      dotColor: 'var(--blue)',
    },
    neutral: {
      color: 'var(--text-muted)',
      backgroundColor: 'var(--chip-bg)',
      borderColor: 'var(--border)',
      dotColor: 'var(--text-dim)',
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
        fontSize: isSm ? '0.68rem' : '0.74rem',
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        borderRadius: 'var(--radius-sharp)',
        border: '1px solid',
        lineHeight: 1.3,
        ...currentVariant,
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: currentVariant.dotColor,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
