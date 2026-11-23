import React from 'react';

/**
 * Control Room Base Panel Component (Unslopped)
 * Quiet neutral surface, 1px structural hairline, calm typography without uppercase shouting.
 */
export function Panel({
  title,
  subtitle,
  action,
  children,
  style = {},
  className = '',
  bodyStyle = {},
}) {
  return (
    <div
      className={`control-panel ${className}`}
      style={{
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-panel)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {(title || action) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--subtle-bg)',
          }}
        >
          <div>
            {title && (
              <h2
                style={{
                  fontSize: '0.84rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 500,
                  color: 'var(--text)',
                  margin: 0,
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  marginTop: '2px',
                  margin: 0,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{ padding: '16px', flex: 1, ...bodyStyle }}>
        {children}
      </div>
    </div>
  );
}

export default Panel;
