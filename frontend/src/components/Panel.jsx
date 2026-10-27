import React from 'react';

/**
 * Control Room Base Panel Component
 * Dense surface (#12161C), 1px structural border (#2A2F38), sharp 2-4px radius, no drop shadows.
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
            padding: '10px 14px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--subtle-bg)',
          }}
        >
          <div>
            {title && (
              <h2
                style={{
                  fontSize: '0.82rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--text)',
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  marginTop: '2px',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{ padding: '14px', flex: 1, ...bodyStyle }}>
        {children}
      </div>
    </div>
  );
}

export default Panel;
