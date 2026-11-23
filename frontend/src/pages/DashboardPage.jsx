import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle,
  Train as TrainIcon,
  Search,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { useGetSectionStateQuery, useGetConflictsQuery } from '../features/api/apiSlice';
import { useLiveSocket } from '../lib/useLiveSocket';
import { flashIn } from '../lib/gsapAnimations';
import { Panel, Badge, Button, Skeleton, SkeletonPanel, SkeletonTable, ErrorPanel } from '../components';
import { SchematicTrackDiagram } from '../features/twin/SchematicTrackDiagram';

export default function DashboardPage() {
  const {
    data: sectionData,
    isLoading: isStateLoading,
    isError: isStateError,
    error: stateError,
    refetch: refetchState,
  } = useGetSectionStateQuery('default');

  const {
    data: conflictsData,
    isLoading: isConflictsLoading,
    isError: isConflictsError,
    error: conflictsError,
    refetch: refetchConflicts,
  } = useGetConflictsQuery('default');

  const { lastEvent } = useLiveSocket();

  const [selectedTrainId, setSelectedTrainId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sortField, setSortField] = useState('delay'); // 'delay' | 'train_number' | 'priority'
  const [sortAsc, setSortAsc] = useState(false);

  const trains = sectionData?.trains || [];
  const conflicts = conflictsData || [];

  // Track previous delays for GSAP flashIn triggering on update
  const prevDelaysRef = useRef({});
  const rowRefs = useRef({});

  useEffect(() => {
    if (!trains.length) return;

    trains.forEach((t) => {
      const prevDelay = prevDelaysRef.current[t.train_id];
      if (prevDelay !== undefined && prevDelay !== t.delay_minutes) {
        const el = rowRefs.current[t.train_id];
        if (el) {
          flashIn(el);
        }
      }
      prevDelaysRef.current[t.train_id] = t.delay_minutes;
    });
  }, [trains, lastEvent]);

  // Compute Summary Statistics
  const totalTrains = trains.length;
  const conflictCount = conflicts.length;
  const delayedTrains = trains.filter((t) => t.delay_minutes > 0);
  const onTimeTrains = trains.filter((t) => t.delay_minutes <= 0);
  const totalDelayMinutes = trains.reduce((acc, t) => acc + (t.delay_minutes || 0), 0);
  const avgDelayMinutes = totalTrains > 0 ? (totalDelayMinutes / totalTrains).toFixed(1) : '0.0';

  // Filter & Sort Trains
  const filteredTrains = trains.filter((t) => {
    const matchesSearch =
      t.train_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.current_resource_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'ALL' || t.priority_class === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const sortedTrains = [...filteredTrains].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'delay') {
      comparison = (b.delay_minutes || 0) - (a.delay_minutes || 0);
    } else if (sortField === 'train_number') {
      comparison = a.train_number.localeCompare(b.train_number);
    } else if (sortField === 'priority') {
      const priorityOrder = { Rajdhani: 4, Express: 3, Passenger: 2, Freight: 1 };
      comparison = (priorityOrder[b.priority_class] || 0) - (priorityOrder[a.priority_class] || 0);
    }
    return sortAsc ? -comparison : comparison;
  });

  const getPriorityBadgeVariant = (pClass) => {
    switch (pClass) {
      case 'Rajdhani': return 'amber';
      case 'Express': return 'blue';
      case 'Passenger': return 'green';
      default: return 'neutral';
    }
  };

  const getDelayStyle = (mins) => {
    if (mins <= 0) return { color: 'var(--green)', fontWeight: 600 };
    if (mins <= 15) return { color: 'var(--amber)', fontWeight: 600 };
    return { color: 'var(--red)', fontWeight: 700 };
  };

  if (isStateError) {
    return (
      <div style={{ padding: '20px' }}>
        <ErrorPanel
          title="DIGITAL TWIN TELEMETRY OFFLINE"
          message="Failed to retrieve division section state from the backend service. Ensure uvicorn backend is running on port 8000."
          error={stateError}
          onRetry={() => {
            refetchState();
            refetchConflicts();
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ========================================================= */}
      {/* 1. Operational Summary Strip                              */}
      {/* ========================================================= */}
      {isStateLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
          <SkeletonPanel height="110px" />
          <SkeletonPanel height="110px" />
          <SkeletonPanel height="110px" />
          <SkeletonPanel height="110px" />
        </div>
      ) : (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Total Fleet */}
        <Panel bodyStyle={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Division fleet
            </span>
            <TrainIcon size={14} color="var(--text-muted)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 600, color: 'var(--text)' }}>
              {totalTrains}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>active units</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <Badge size="sm" variant="green" dot>{onTimeTrains.length} on time</Badge>
            <Badge size="sm" variant={delayedTrains.length > 0 ? 'amber' : 'neutral'}>
              {delayedTrains.length} delayed
            </Badge>
          </div>
        </Panel>

        {/* Active Resource Conflicts */}
        <Panel bodyStyle={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Active conflicts
            </span>
            <AlertTriangle size={14} color={conflictCount > 0 ? 'var(--red)' : 'var(--green)'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.4rem',
                fontWeight: 600,
                color: conflictCount > 0 ? 'var(--red)' : 'var(--green)',
              }}
            >
              {conflictCount}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>detected</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Badge size="sm" variant={conflictCount > 0 ? 'red' : 'green'} dot>
              {conflictCount > 0 ? 'Action required' : 'Clear'}
            </Badge>
          </div>
        </Panel>

        {/* Average Delay */}
        <Panel bodyStyle={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Avg division delay
            </span>
            <Clock size={14} color="var(--text-muted)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 600, color: 'var(--amber)' }}>
              +{avgDelayMinutes}m
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>per train</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Max delay: +{Math.max(0, ...trains.map((t) => t.delay_minutes || 0)).toFixed(0)}m
            </span>
          </div>
        </Panel>

        {/* Punctuality Status */}
        <Panel bodyStyle={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Punctuality rate
            </span>
            <CheckCircle size={14} color="var(--green)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 600, color: 'var(--green)' }}>
              {totalTrains > 0 ? Math.round((onTimeTrains.length / totalTrains) * 100) : 100}%
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>schedule match</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Badge size="sm" variant="green" dot>Auto-optimizer ready</Badge>
          </div>
        </Panel>
      </div>
      )}

      {/* ========================================================= */}
      {/* 2. Schematic Track Diagram (SVG Control Panel)            */}
      {/* ========================================================= */}
      <Panel
        title="Schematic track diagram"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--amber)', fontWeight: 500 }}>Rajdhani</span>
              <span style={{ color: 'var(--blue)', fontWeight: 500 }}>Express</span>
              <span style={{ color: 'var(--green)', fontWeight: 500 }}>Passenger</span>
              <span style={{ color: '#B37FEB', fontWeight: 500 }}>Freight</span>
            </div>
            {selectedTrainId && (
              <Button size="sm" variant="secondary" onClick={() => setSelectedTrainId(null)}>
                Clear selection
              </Button>
            )}
          </div>
        }
      >
        <SchematicTrackDiagram
          trains={trains}
          conflicts={conflicts}
          selectedTrainId={selectedTrainId}
          onSelectTrain={(id) => setSelectedTrainId(id === selectedTrainId ? null : id)}
        />
      </Panel>

      {/* ========================================================= */}
      {/* 3. Live Trains Fleet Table                                */}
      {/* ========================================================= */}
      <Panel
        title="Fleet telemetry"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search train / block..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: '0.74rem',
                  fontFamily: 'var(--font-sans)',
                  padding: '4px 8px 4px 26px',
                  borderRadius: 'var(--radius-control)',
                  outline: 'none',
                  width: '160px',
                }}
              />
            </div>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-sans)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-control)',
                outline: 'none',
              }}
            >
              <option value="ALL">All classes</option>
              <option value="Rajdhani">Rajdhani</option>
              <option value="Express">Express</option>
              <option value="Passenger">Passenger</option>
              <option value="Freight">Freight</option>
            </select>
          </div>
        }
        bodyStyle={{ padding: 0 }}
      >
        <div className="ops-table-container">
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: 'var(--subtle-bg)',
                  color: 'var(--text-muted)',
                  textAlign: 'left',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                }}
              >
                <th
                  style={{ padding: '8px 14px', cursor: 'pointer' }}
                  onClick={() => {
                    setSortField('train_number');
                    setSortAsc(!sortAsc);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Train <ArrowUpDown size={11} />
                  </div>
                </th>
                <th style={{ padding: '8px 14px' }}>Name</th>
                <th
                  style={{ padding: '8px 14px', cursor: 'pointer' }}
                  onClick={() => {
                    setSortField('priority');
                    setSortAsc(!sortAsc);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Priority <ArrowUpDown size={11} />
                  </div>
                </th>
                <th style={{ padding: '8px 14px' }}>Direction</th>
                <th style={{ padding: '8px 14px' }}>Current resource</th>
                <th style={{ padding: '8px 14px' }}>Speed</th>
                <th
                  style={{ padding: '8px 14px', cursor: 'pointer' }}
                  onClick={() => {
                    setSortField('delay');
                    setSortAsc(!sortAsc);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Delay <ArrowUpDown size={11} />
                  </div>
                </th>
                <th style={{ padding: '8px 14px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedTrains.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {isStateLoading ? 'Querying Division Digital Twin telemetry...' : 'No trains matching current filters.'}
                  </td>
                </tr>
              ) : (
                sortedTrains.map((train) => {
                  const isSelected = selectedTrainId === train.train_id;
                  const isDelayed = train.delay_minutes > 0;

                  return (
                    <tr
                      key={train.train_id}
                      ref={(el) => (rowRefs.current[train.train_id] = el)}
                      onClick={() => setSelectedTrainId(isSelected ? null : train.train_id)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isSelected
                          ? 'rgba(255, 176, 32, 0.08)'
                          : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 150ms ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--panel-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Train Number */}
                      <td style={{ padding: '8px 14px', fontWeight: 700, color: 'var(--text)' }}>
                        {train.train_number}
                      </td>

                      {/* Name */}
                      <td style={{ padding: '8px 14px', color: 'var(--text-muted)' }}>
                        {train.name}
                      </td>

                      {/* Priority Class */}
                      <td style={{ padding: '8px 14px' }}>
                        <Badge size="sm" variant={getPriorityBadgeVariant(train.priority_class)}>
                          {train.priority_class}
                        </Badge>
                      </td>

                      {/* Direction */}
                      <td style={{ padding: '8px 14px', color: 'var(--text-muted)' }}>
                        <span
                          style={{
                            padding: '1px 5px',
                            borderRadius: 'var(--radius-sharp)',
                            border: '1px solid var(--border)',
                            color: train.direction === 'DOWN' ? 'var(--blue)' : 'var(--amber)',
                            fontSize: '0.68rem',
                          }}
                        >
                          {train.direction}
                        </span>
                      </td>

                      {/* Current Resource */}
                      <td style={{ padding: '8px 14px', color: 'var(--text)' }}>
                        <span
                          style={{
                            backgroundColor: 'var(--chip-bg)',
                            padding: '2px 6px',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sharp)',
                          }}
                        >
                          {train.current_resource_id}
                        </span>
                      </td>

                      {/* Speed */}
                      <td style={{ padding: '8px 14px', color: 'var(--text-muted)' }}>
                        {train.current_speed_kmph.toFixed(0)} km/h
                      </td>

                      {/* Delay (Color-Coded Monospace) */}
                      <td style={{ padding: '8px 14px', ...getDelayStyle(train.delay_minutes) }}>
                        {train.delay_minutes > 0 ? `+${train.delay_minutes.toFixed(1)}m` : '0.0m'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '8px 14px' }}>
                        <Badge size="sm" variant={isDelayed ? 'amber' : 'green'} dot={isDelayed}>
                          {train.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
