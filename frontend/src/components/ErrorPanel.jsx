import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Panel } from './Panel';
import { Button } from './Button';

/**
 * Control Room Error State Component
 * Renders standardized error panel with red accent and retry affordance.
 */
export function ErrorPanel({
  title = 'TELEMETRY CONNECTION ERROR',
  message = 'Failed to communicate with the railway digital twin backend.',
  error = null,
  onRetry = null,
  style = {},
}) {
  const detailStr = error?.data?.detail || error?.message || (typeof error === 'string' ? error : null);

  return (
    <Panel
      style={{
        borderLeft: '4px solid var(--red)',
        backgroundColor: 'rgba(229, 72, 77, 0.05)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <div
          style={{
            padding: '8px',
            backgroundColor: 'rgba(229, 72, 77, 0.12)',
            borderRadius: 'var(--radius-sharp)',
            border: '1px solid var(--red)',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={20} color="var(--red)" />
        </div>

        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '0.92rem',
              fontWeight: 700,
              color: 'var(--red)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '4px',
            }}
          >
            {title}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text)', lineHeight: 1.4, marginBottom: detailStr ? '6px' : '10px' }}>
            {message}
          </p>

          {detailStr && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                backgroundColor: 'rgba(220, 38, 38, 0.06)',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sharp)',
                border: '1px solid var(--border)',
                marginBottom: '10px',
                wordBreak: 'break-all',
              }}
            >
              DETAIL: {detailStr}
            </div>
          )}

          {onRetry && (
            <Button
              size="sm"
              variant="danger"
              onClick={onRetry}
              icon={<RotateCcw size={12} />}
            >
              RETRY TELEMETRY FETCH
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}

export default ErrorPanel;
