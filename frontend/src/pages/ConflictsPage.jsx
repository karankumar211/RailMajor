import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Info,
} from 'lucide-react';
import {
  useGetConflictsQuery,
  useGetRecommendationsQuery,
  usePostDecisionMutation,
  useGetSectionStateQuery,
} from '../features/api/apiSlice';
import { selectCurrentUser } from '../features/auth/authSlice';
import { Panel, Badge, Button, SkeletonPanel, ErrorPanel } from '../components';
import { RecommendationCard } from '../features/conflicts/RecommendationCard';

export default function ConflictsPage() {
  const [searchParams] = useSearchParams();
  const queryConflictId = searchParams.get('conflictId');
  const currentUser = useSelector(selectCurrentUser);


  const {
    data: conflicts = [],
    isLoading: isConflictsLoading,
    isError: isConflictsError,
    error: conflictsError,
    refetch: refetchConflicts,
  } = useGetConflictsQuery('default');
  const { data: sectionData } = useGetSectionStateQuery('default');
  const [postDecision, { isLoading: isDeciding }] = usePostDecisionMutation();

  const [selectedConflictId, setSelectedConflictId] = useState(queryConflictId || null);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'block' | 'platform' | 'junction'
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvedDecisionsMap, setResolvedDecisionsMap] = useState({});

  // Trains map for fast metadata lookup
  const trainsMap = {};
  (sectionData?.trains || []).forEach((t) => {
    trainsMap[t.train_id] = t;
  });

  // Auto-select queryConflictId or first conflict if none selected
  useEffect(() => {
    if (queryConflictId) {
      setSelectedConflictId(queryConflictId);
    } else if (!selectedConflictId && conflicts.length > 0) {
      setSelectedConflictId(conflicts[0].conflict_id);
    }
  }, [conflicts, queryConflictId, selectedConflictId]);

  // Query recommendations for selected conflict
  const {
    data: recsPayload,
    isLoading: isRecsLoading,
    isError: isRecsError,
    error: recsError,
    refetch: refetchRecs,
  } = useGetRecommendationsQuery(selectedConflictId, {
    skip: !selectedConflictId,
  });

  // Filter conflicts
  const filteredConflicts = conflicts.filter((c) => {
    const matchesType = filterType === 'ALL' || c.resource_type === filterType;
    const matchesSearch =
      c.resource_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.trains.some((tId) => {
        const tObj = trainsMap[tId];
        return (
          tId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (tObj && tObj.train_number.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      });
    return matchesType && matchesSearch;
  });

  const selectedConflict = conflicts.find((c) => c.conflict_id === selectedConflictId);

  // Decision Handlers
  const handleAccept = async (recId) => {
    try {
      const res = await postDecision({
        recId,
        decision_type: 'ACCEPT',
        controller_id: currentUser?.username || 'controller',
        override_action: 'Dispatcher accepted AI recommended action.',
      }).unwrap();

      setResolvedDecisionsMap((prev) => ({
        ...prev,
        [selectedConflictId]: res,
      }));
    } catch (err) {
      console.error('Failed to submit decision:', err);
    }
  };

  const handleOverride = async (recId, reason) => {
    try {
      const res = await postDecision({
        recId,
        decision_type: 'OVERRIDE',
        controller_id: currentUser?.username || 'controller',
        override_action: reason,
      }).unwrap();

      setResolvedDecisionsMap((prev) => ({
        ...prev,
        [selectedConflictId]: res,
      }));
    } catch (err) {
      console.error('Failed to submit override:', err);
    }
  };

  const handleModify = async (recId, minutes) => {
    try {
      const res = await postDecision({
        recId,
        decision_type: 'MODIFY',
        controller_id: currentUser?.username || 'controller',
        override_action: `Modified hold duration to ${minutes} mins.`,
      }).unwrap();

      setResolvedDecisionsMap((prev) => ({
        ...prev,
        [selectedConflictId]: res,
      }));
    } catch (err) {
      console.error('Failed to submit modification:', err);
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      {/* ========================================================= */}
      {/* Top Banner: Core Principle "AI Recommends, You Decide"    */}
      {/* ========================================================= */}
      <div
        style={{
          backgroundColor: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-panel)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1
            style={{
              fontSize: '0.96rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Conflicts & dispatch advisory
          </h1>
          <Badge variant="amber" size="sm" dot>
            Advisory
          </Badge>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Badge variant="red" size="md" dot>
            {conflicts.length} open
          </Badge>
          <Badge variant="green" size="md" dot>
            {Object.keys(resolvedDecisionsMap).length} resolved
          </Badge>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2-Column Split Workspace Layout                          */}
      {/* ========================================================= */}
      <div
        className="ops-split-grid"
        style={{
          flex: 1,
          minHeight: '520px',
        }}
      >
        {/* ------------------------------------------------------- */}
        {/* Left Column: Active Conflict Queue                      */}
        {/* ------------------------------------------------------- */}
        <Panel
          title="Active conflicts"
          subtitle={`${filteredConflicts.length} pending resource conflicts requiring dispatcher resolution`}
          action={
            <div style={{ display: 'flex', gap: '6px' }}>
              {/* Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-sans)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-control)',
                  outline: 'none',
                }}
              >
                <option value="ALL">All types</option>
                <option value="block">Block</option>
                <option value="platform">Platform</option>
                <option value="junction">Junction</option>
              </select>
            </div>
          }
          style={{ display: 'flex', flexDirection: 'column' }}
          bodyStyle={{ padding: '8px', overflowY: 'auto', maxHeight: 'calc(100vh - 190px)' }}
        >
          {/* Quick Search */}
          <div style={{ padding: '4px 6px 8px 6px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Filter conflicts by train / resource..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  padding: '5px 8px 5px 26px',
                  borderRadius: 'var(--radius-sharp)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Conflict Cards List */}
          {isConflictsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <SkeletonPanel height="75px" />
              <SkeletonPanel height="75px" />
              <SkeletonPanel height="75px" />
              <SkeletonPanel height="75px" />
              <SkeletonPanel height="75px" />
            </div>
          ) : isConflictsError ? (
            <ErrorPanel
              title="CONFLICT QUEUE OFFLINE"
              message="Failed to evaluate and retrieve active conflict queue."
              error={conflictsError}
              onRetry={refetchConflicts}
            />
          ) : filteredConflicts.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              No conflicts matching criteria.
            </div>
          ) : (
            filteredConflicts.map((c) => {
              const isSelected = selectedConflictId === c.conflict_id;
              const isResolved = Boolean(resolvedDecisionsMap[c.conflict_id]);
              const tA = trainsMap[c.trains[0]] || { train_number: c.trains[0], priority_class: 'Train' };
              const tB = trainsMap[c.trains[1]] || { train_number: c.trains[1], priority_class: 'Train' };

              return (
                <div
                  key={c.conflict_id}
                  onClick={() => setSelectedConflictId(c.conflict_id)}
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(217, 119, 6, 0.08)'
                      : 'var(--panel)',
                    border: '1px solid',
                    borderColor: isSelected
                      ? 'var(--amber)'
                      : isResolved
                      ? 'var(--green)'
                      : 'var(--border)',
                    borderLeft: isResolved ? '4px solid var(--green)' : '4px solid var(--red)',
                    borderRadius: 'var(--radius-panel)',
                    padding: '10px 12px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  {/* Resource & Duration Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'var(--text)',
                        }}
                      >
                        {c.resource_id}
                      </span>
                      <Badge size="sm" variant={c.resource_type === 'block' ? 'neutral' : 'blue'}>
                        {c.resource_type}
                      </Badge>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isResolved ? (
                        <Badge size="sm" variant="green">
                          RESOLVED
                        </Badge>
                      ) : (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--red)', fontWeight: 600 }}>
                          {c.window?.duration_minutes || 0}m OVERLAP
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Conflicting Trains Grid */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--chip-bg)',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sharp)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--text)', fontWeight: 600 }}>
                        {tA.train_number}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
                        {tA.priority_class}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--red)', textTransform: 'uppercase' }}>
                        CONFLICT
                      </span>
                      <ArrowRight size={12} color="var(--red)" />
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--text)', fontWeight: 600 }}>
                        {tB.train_number}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
                        {tB.priority_class}
                      </div>
                    </div>
                  </div>

                  {/* Window Range */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '6px',
                      fontSize: '0.66rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>WINDOW: {c.window?.start?.slice(11, 16)} &rarr; {c.window?.end?.slice(11, 16)}</span>
                    <span style={{ color: isSelected ? 'var(--amber)' : 'var(--text-dim)' }}>
                      {isSelected ? '• REVIEWING ADVISORY' : 'CLICK TO REVIEW'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </Panel>

        {/* ------------------------------------------------------- */}
        {/* Right Column: AI Recommendations & Decision Console     */}
        {/* ------------------------------------------------------- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {selectedConflict ? (
            <>
              {/* Conflict Header Overview Panel */}
              <Panel
                title={`DISPATCH ADVISORY: ${selectedConflict.conflict_id}`}
                action={
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Badge variant={resolvedDecisionsMap[selectedConflict.conflict_id] ? 'green' : 'red'}>
                      {resolvedDecisionsMap[selectedConflict.conflict_id] ? 'DECISION COMMITTED' : 'AWAITING DECISION'}
                    </Badge>
                  </div>
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} color="var(--amber)" />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text)' }}>
                        OVERLAP: <strong>{selectedConflict.window?.duration_minutes}m</strong> ({selectedConflict.window?.start?.slice(11, 16)} &rarr; {selectedConflict.window?.end?.slice(11, 16)})
                      </span>
                    </div>
                    <span style={{ color: 'var(--border)' }}>|</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      TYPE: <strong style={{ color: 'var(--text)' }}>{selectedConflict.conflict_type.toUpperCase()}</strong>
                    </span>
                  </div>

                  <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    TARGET SECTION: <span style={{ color: 'var(--text)' }}>NCR DELHI-KANPUR TRUNK</span>
                  </div>
                </div>
              </Panel>

              {/* Recommendations Section */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                    padding: '0 4px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Ranked Dispatch Solutions ({recsPayload?.recommendations?.length || 0} Candidates Computed)
                  </span>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                    OPTIMIZER: V1 PRIORITY-RULE HEURISTIC
                  </span>
                </div>

                {isRecsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <SkeletonPanel height="170px" />
                    <SkeletonPanel height="170px" />
                  </div>
                ) : isRecsError ? (
                  <ErrorPanel
                    title="ADVISORY ENGINE ERROR"
                    message="Failed to compute optimization candidate recommendations for this conflict."
                    error={recsError}
                    onRetry={refetchRecs}
                  />
                ) : (
                  (recsPayload?.recommendations || []).map((rec) => (
                    <RecommendationCard
                      key={rec.rec_id}
                      rec={rec}
                      conflict={selectedConflict}
                      trainsMap={trainsMap}
                      onAccept={handleAccept}
                      onOverride={handleOverride}
                      onModify={handleModify}
                      isProcessing={isDeciding}
                      isResolved={Boolean(resolvedDecisionsMap[selectedConflict.conflict_id])}
                      recordedDecision={resolvedDecisionsMap[selectedConflict.conflict_id]}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <Panel style={{ padding: '40px', textAlign: 'center' }}>
              <AlertTriangle size={32} color="var(--amber)" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.96rem', color: 'var(--text)', marginBottom: '6px' }}>
                NO CONFLICT SELECTED
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Select a conflicting resource from the active queue on the left to review the AI's ranked candidates, plain-language rationale, and issue a dispatch decision.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
