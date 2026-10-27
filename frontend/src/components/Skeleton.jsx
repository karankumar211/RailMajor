import React from 'react';

/**
 * Control Room Skeleton Component
 * Dark theme loading placeholder using subtle panel contrasts and pulse animation.
 */
export function Skeleton({ width = '100%', height = '16px', borderRadius = 'var(--radius-sharp)', style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: 'var(--skeleton-pulse-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius,
        animation: 'controlRoomPulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export function SkeletonPanel({ height = '180px', title = 'LOADING TELEMETRY...' }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-panel)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: height,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="140px" height="12px" />
        <Skeleton width="60px" height="18px" />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
        <Skeleton width="90%" height="14px" />
        <Skeleton width="75%" height="14px" />
        <Skeleton width="60%" height="14px" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 6 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px' }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr 1fr 1fr 2fr 1fr',
            gap: '12px',
            padding: '8px 10px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <Skeleton height="14px" width="70%" />
          <Skeleton height="14px" width="85%" />
          <Skeleton height="14px" width="60%" />
          <Skeleton height="14px" width="40%" />
          <Skeleton height="14px" width="80%" />
          <Skeleton height="14px" width="50%" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
