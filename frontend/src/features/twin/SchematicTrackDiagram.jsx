import React, { useState } from 'react';

/**
 * Control Room Schematic Track Diagram (SVG)
 * Shows stations left-to-right, double-track block sections (UP/DOWN),
 * branch lines (MB, AF), loop lines, and real-time train telemetry markers.
 */

const MAINLINE_STATIONS = [
  { id: 'NDLS', name: 'New Delhi', x: 60 },
  { id: 'GZB',  name: 'Ghaziabad Jn', x: 170, isJunction: true },
  { id: 'ALJN', name: 'Aligarh Jn', x: 280 },
  { id: 'HRS',  name: 'Hathras Jn', x: 390 },
  { id: 'TDL',  name: 'Tundla Jn', x: 500, isJunction: true },
  { id: 'FZD',  name: 'Firozabad', x: 610 },
  { id: 'ETW',  name: 'Etawah Jn', x: 720 },
  { id: 'PHD',  name: 'Phaphund', x: 830 },
  { id: 'CNB',  name: 'Kanpur Central', x: 940 },
];

const BRANCH_STATIONS = [
  { id: 'MB', name: 'Moradabad', x: 240, y: 35, from: 'GZB' },
  { id: 'AF', name: 'Agra Fort', x: 570, y: 225, from: 'TDL' },
];

const Y_DOWN = 100; // DOWN Track (NDLS -> CNB)
const Y_UP   = 160; // UP Track (CNB -> NDLS)

export function SchematicTrackDiagram({ trains = [], conflicts = [], selectedTrainId, onSelectTrain }) {
  const [hoveredTrain, setHoveredTrain] = useState(null);

  // Map station x coordinates
  const stXMap = {};
  MAINLINE_STATIONS.forEach((s) => {
    stXMap[s.id] = s.x;
  });

  // Calculate train position on the SVG canvas
  const getTrainCoordinates = (train, indexOnResource = 0) => {
    const resId = train.current_resource_id || '';
    const isDown = train.direction === 'DOWN';
    const baseY = isDown ? Y_DOWN : Y_UP;

    // 1. Station Platform
    if (resId.includes('_PF_')) {
      const stId = resId.split('_PF_')[0];
      const stX = stXMap[stId];
      if (stX !== undefined) {
        return {
          x: stX + (indexOnResource * 14 - 7),
          y: baseY + (train.current_resource_type === 'platform' && resId.endsWith('3') ? (isDown ? -16 : 16) : 0),
          label: `${stId} PF`,
        };
      }
      if (stId === 'MB') return { x: 240 + indexOnResource * 12, y: 35, label: 'MB PF' };
      if (stId === 'AF') return { x: 570 + indexOnResource * 12, y: 225, label: 'AF PF' };
    }

    // 2. Block Section
    if (resId.startsWith('BLK_')) {
      const parts = resId.replace('BLK_', '').split('_');
      // Format: BLK_FROM_TO_DIR
      const fromSt = parts[0];
      const toSt = parts[1];
      const x1 = stXMap[fromSt];
      const x2 = stXMap[toSt];

      if (x1 !== undefined && x2 !== undefined) {
        const midX = (x1 + x2) / 2;
        return {
          x: midX + (indexOnResource * 18 - 9),
          y: baseY,
          label: `${fromSt}->${toSt}`,
        };
      }

      // Branch blocks
      if (resId.includes('MB')) {
        return { x: 205 + indexOnResource * 12, y: 65, label: 'GZB-MB' };
      }
      if (resId.includes('AF')) {
        return { x: 535 + indexOnResource * 12, y: 190, label: 'TDL-AF' };
      }
    }

    // Fallback default position
    return { x: 60 + indexOnResource * 16, y: baseY, label: 'DEPOT' };
  };

  // Group trains on same resource to prevent overlapping markers
  const resourceGroups = {};
  trains.forEach((t) => {
    const rId = t.current_resource_id || 'UNKNOWN';
    if (!resourceGroups[rId]) resourceGroups[rId] = [];
    resourceGroups[rId].push(t);
  });

  // Conflicted resource set for visual highlighting
  const conflictedResources = new Set(conflicts.map((c) => c.resource_id));

  const getPriorityColor = (pClass) => {
    switch (pClass) {
      case 'Rajdhani':
        return 'var(--amber)';
      case 'Express':
        return 'var(--blue)';
      case 'Passenger':
        return 'var(--green)';
      case 'Freight':
        return 'var(--slate)';
      default:
        return 'var(--text-muted)';
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', overflowX: 'auto', backgroundColor: 'var(--panel)', borderRadius: 'var(--radius-panel)' }}>
      <svg
        viewBox="0 0 1000 260"
        style={{
          width: '100%',
          minWidth: '850px',
          height: '240px',
          display: 'block',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <defs>
          {/* Signal Light Glow Filters */}
          <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ---------------------------------------------------- */}
        {/* Track Grid Background Reference Lines                */}
        {/* ---------------------------------------------------- */}
        <g stroke="rgba(15, 23, 42, 0.12)" strokeWidth="1" strokeDasharray="3 3">
          <line x1="40" y1="Y_DOWN" x2="960" y2="Y_DOWN" />
          <line x1="40" y1="Y_UP" x2="960" y2="Y_UP" />
        </g>

        {/* ---------------------------------------------------- */}
        {/* Branch Lines                                         */}
        {/* ---------------------------------------------------- */}
        {/* GZB to Moradabad (MB) */}
        <path
          d={`M ${stXMap['GZB']} ${Y_DOWN} L 240 35`}
          fill="none"
          stroke={conflictedResources.has('BLK_GZB_MB_DN') ? 'var(--red)' : '#94A3B8'}
          strokeWidth="2.5"
          strokeDasharray="4 2"
        />
        {/* TDL to Agra Fort (AF) */}
        <path
          d={`M ${stXMap['TDL']} ${Y_UP} L 570 225`}
          fill="none"
          stroke={conflictedResources.has('BLK_TDL_AF_DN') ? 'var(--red)' : '#94A3B8'}
          strokeWidth="2.5"
          strokeDasharray="4 2"
        />

        {/* ---------------------------------------------------- */}
        {/* Mainline Double Tracks (DOWN & UP)                   */}
        {/* ---------------------------------------------------- */}
        {/* DOWN Track: NDLS -> CNB */}
        <line
          x1="50"
          y1={Y_DOWN}
          x2="950"
          y2={Y_DOWN}
          stroke="#475569"
          strokeWidth="3.5"
        />
        {/* UP Track: CNB -> NDLS */}
        <line
          x1="50"
          y1={Y_UP}
          x2="950"
          y2={Y_UP}
          stroke="#475569"
          strokeWidth="3.5"
        />

        {/* Track Direction Arrows */}
        <g fill="var(--text-dim)" fontSize="9">
          {[120, 230, 340, 450, 560, 670, 780, 890].map((x) => (
            <React.Fragment key={x}>
              <text x={x} y={Y_DOWN - 6} textAnchor="middle">&#9654; DN (TO CNB)</text>
              <text x={x} y={Y_UP + 14} textAnchor="middle">&#9664; UP (TO NDLS)</text>
            </React.Fragment>
          ))}
        </g>

        {/* ---------------------------------------------------- */}
        {/* Station Interlockings & Platform Nodes               */}
        {/* ---------------------------------------------------- */}
        {MAINLINE_STATIONS.map((st) => (
          <g key={st.id} transform={`translate(${st.x}, 0)`}>
            {/* Station Mast */}
            <line
              x1="0"
              y1={Y_DOWN - 22}
              x2="0"
              y2={Y_UP + 22}
              stroke="var(--border)"
              strokeWidth="2"
            />
            {/* Platform Track Rungs */}
            <circle cx="0" cy={Y_DOWN} r="4" fill="var(--panel)" stroke="var(--border)" strokeWidth="2" />
            <circle cx="0" cy={Y_UP} r="4" fill="var(--panel)" stroke="var(--border)" strokeWidth="2" />

            {/* Loop line bypass glyph if junction */}
            {st.isJunction && (
              <rect
                x="-12"
                y={Y_DOWN - 18}
                width="24"
                height="3"
                fill="none"
                stroke="var(--amber)"
                strokeWidth="1.5"
              />
            )}

            {/* Station Label */}
            <text
              x="0"
              y={Y_UP + 36}
              fill="var(--text)"
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
              letterSpacing="0.05em"
            >
              {st.id}
            </text>
            <text
              x="0"
              y={Y_UP + 48}
              fill="var(--text-muted)"
              fontSize="7.5"
              textAnchor="middle"
            >
              {st.name}
            </text>
          </g>
        ))}

        {/* Branch Station Nodes */}
        {BRANCH_STATIONS.map((bst) => (
          <g key={bst.id} transform={`translate(${bst.x}, ${bst.y})`}>
            <circle cx="0" cy="0" r="5" fill="var(--panel)" stroke="var(--blue)" strokeWidth="2" />
            <text x="8" y="4" fill="var(--blue)" fontSize="9" fontWeight="700">
              {bst.id} ({bst.name})
            </text>
          </g>
        ))}

        {/* ---------------------------------------------------- */}
        {/* Live Train Telemetry Markers                         */}
        {/* ---------------------------------------------------- */}
        {Object.entries(resourceGroups).map(([resId, groupTrains]) => {
          const isConflicted = conflictedResources.has(resId);

          return groupTrains.map((train, idx) => {
            const coords = getTrainCoordinates(train, idx);
            const color = getPriorityColor(train.priority_class);
            const isSelected = selectedTrainId === train.train_id;
            const hasDelay = train.delay_minutes > 0;

            return (
              <g
                key={train.train_id}
                transform={`translate(${coords.x}, ${coords.y})`}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectTrain && onSelectTrain(train.train_id)}
                onMouseEnter={() => setHoveredTrain(train)}
                onMouseLeave={() => setHoveredTrain(null)}
              >
                {/* Conflict Alert Indicator */}
                {isConflicted && (
                  <circle
                    cx="0"
                    cy="0"
                    r="13"
                    fill="none"
                    stroke="var(--red)"
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                  />
                )}

                {/* Train Marker Body */}
                <rect
                  x="-9"
                  y="-9"
                  width="18"
                  height="18"
                  rx="3"
                  fill={isSelected ? 'var(--text)' : 'var(--panel-active)'}
                  stroke={isSelected ? 'var(--amber)' : isConflicted ? 'var(--red)' : color}
                  strokeWidth={isSelected ? '2' : '1.5'}
                />

                {/* Train Direction Triangle */}
                <polygon
                  points={
                    train.direction === 'DOWN'
                      ? '-4,-4 5,0 -4,4'
                      : '4,-4 -5,0 4,4'
                  }
                  fill={isSelected ? '#FFFFFF' : color}
                />

                {/* Delay Warning Badge */}
                {hasDelay && (
                  <circle
                    cx="7"
                    cy="-7"
                    r="3.5"
                    fill="var(--amber)"
                    filter="url(#glow-amber)"
                  />
                )}

                {/* Train Number Mini-tag (condensed when stacked to prevent messy text overlap) */}
                {(isSelected || groupTrains.length === 1 || idx === 0) && (
                  <text
                    x="0"
                    y="18"
                    fill={isSelected ? 'var(--amber)' : 'var(--text)'}
                    fontSize="7.5"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {groupTrains.length > 1 && idx === 0 && !isSelected ? `${train.train_number} (+${groupTrains.length - 1})` : train.train_number}
                  </text>
                )}
              </g>
            );
          });
        })}
      </svg>

      {/* Floating Telemetry Tooltip on Hover */}
      {hoveredTrain && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '12px',
            backgroundColor: 'var(--panel)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
            borderRadius: 'var(--radius-panel)',
            padding: '8px 12px',
            pointerEvents: 'none',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div>
            <span style={{ color: getPriorityColor(hoveredTrain.priority_class), fontWeight: 700 }}>
              {hoveredTrain.priority_class.toUpperCase()} {hoveredTrain.train_number}
            </span>{' '}
            <span style={{ color: 'var(--text-muted)' }}>({hoveredTrain.name})</span>
          </div>
          <div>
            RES: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{hoveredTrain.current_resource_id}</span>
          </div>
          <div>
            DIR: <span style={{ color: 'var(--text)' }}>{hoveredTrain.direction}</span>
          </div>
          <div>
            DELAY:{' '}
            <span style={{ color: hoveredTrain.delay_minutes > 0 ? 'var(--amber)' : 'var(--green)', fontWeight: 700 }}>
              {hoveredTrain.delay_minutes > 0 ? `+${hoveredTrain.delay_minutes}m` : 'ON-TIME'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchematicTrackDiagram;
