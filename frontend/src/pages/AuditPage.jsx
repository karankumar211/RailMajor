import React, { useState } from 'react';
import {
  ClipboardList,
  ShieldCheck,
  Search,
  CheckCircle,
  XCircle,
  Edit3,
  Clock,
  Filter,
  ArrowRight,
  Lock,
  Download,
} from 'lucide-react';
import { useGetAuditQuery, useGetSectionStateQuery } from '../features/api/apiSlice';
import { Panel, Badge, Button, SkeletonTable, ErrorPanel } from '../components';

export default function AuditPage() {
  const {
    data: auditRecords = [],
    isLoading: isAuditLoading,
    isError: isAuditError,
    error: auditError,
    refetch: refetchAudit,
  } = useGetAuditQuery('default');
  const { data: sectionData } = useGetSectionStateQuery('default');

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'ACCEPT' | 'OVERRIDE' | 'MODIFY'
  const [timeFilter, setTimeFilter] = useState('ALL'); // 'ALL' | 'LAST_1H' | 'TODAY'

  // Trains metadata map
  const trainsMap = {};
  (sectionData?.trains || []).forEach((t) => {
    trainsMap[t.train_id] = t;
  });

  // Calculate Summary Statistics
  const totalDecisions = auditRecords.length;
  const acceptedCount = auditRecords.filter((d) => d.decision_type === 'ACCEPT').length;
  const overrideCount = auditRecords.filter((d) => d.decision_type === 'OVERRIDE').length;
  const modifyCount = auditRecords.filter((d) => d.decision_type === 'MODIFY').length;
  const acceptanceRate = totalDecisions > 0 ? Math.round((acceptedCount / totalDecisions) * 100) : 100;

  // Filter Records
  const filteredRecords = auditRecords.filter((record) => {
    // 1. Type Filter
    if (typeFilter !== 'ALL' && record.decision_type !== typeFilter) {
      return false;
    }

    // 2. Time Filter
    if (timeFilter === 'LAST_1H') {
      const recordTime = new Date(record.timestamp).getTime();
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (recordTime < oneHourAgo) return false;
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const rec = record.recommendation || {};
      const conf = record.conflict || {};
      const trainIds = conf.trains || [];
      const matchesSearch =
        record.decision_id.toLowerCase().includes(q) ||
        record.controller_id.toLowerCase().includes(q) ||
        (conf.resource_id && conf.resource_id.toLowerCase().includes(q)) ||
        (rec.target_train_id && rec.target_train_id.toLowerCase().includes(q)) ||
        (rec.rationale && rec.rationale.toLowerCase().includes(q)) ||
        (record.override_action && record.override_action.toLowerCase().includes(q)) ||
        trainIds.some((tId) => {
          const tObj = trainsMap[tId];
          return (
            tId.toLowerCase().includes(q) ||
            (tObj && tObj.train_number.toLowerCase().includes(q))
          );
        });
      if (!matchesSearch) return false;
    }

    return true;
  });

  const getDecisionBadge = (decisionType) => {
    switch (decisionType) {
      case 'ACCEPT':
        return <Badge variant="green" dot>Accept</Badge>;
      case 'OVERRIDE':
        return <Badge variant="red" dot>Override</Badge>;
      case 'MODIFY':
        return <Badge variant="amber" dot>Modify</Badge>;
      default:
        return <Badge variant="neutral">{decisionType}</Badge>;
    }
  };

  const formatTimestamp = (isoStr) => {
    if (!isoStr) return 'N/A';
    const dt = new Date(isoStr);
    return dt.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  };

  // Export audit CSV handler (for regulatory reporting demo)
  const handleExportCSV = () => {
    if (!filteredRecords.length) return;
    const headers = ['Timestamp', 'Decision_ID', 'Controller_ID', 'Decision_Type', 'Resource', 'Target_Train', 'Hold_Mins', 'Override_Justification', 'AI_Rationale'];
    const rows = filteredRecords.map((r) => [
      r.timestamp,
      r.decision_id,
      r.controller_id,
      r.decision_type,
      r.conflict?.resource_id || '',
      r.recommendation?.target_train_id || '',
      r.recommendation?.hold_minutes || 0,
      `"${(r.override_action || '').replace(/"/g, '""')}"`,
      `"${(r.recommendation?.rationale || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `railopt_audit_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ========================================================= */}
      {/* Top Banner: Regulatory Compliance & Immutable Ledger     */}
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
            Dispatch audit log
          </h1>
          <Badge variant="green" size="sm" dot>
            Immutable
          </Badge>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportCSV}
            disabled={filteredRecords.length === 0}
            icon={<Download size={13} />}
          >
            EXPORT COMPLIANCE CSV
          </Button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Summary KPI Strip                                         */}
      {/* ========================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Total Decisions */}
        <Panel bodyStyle={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              TOTAL AUDIT RECORDS
            </span>
            <ClipboardList size={14} color="var(--text-muted)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)' }}>
              {totalDecisions}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>DECISIONS COMMITTED</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Badge size="sm" variant="neutral">APPEND-ONLY DB</Badge>
          </div>
        </Panel>

        {/* Acceptance Rate */}
        <Panel bodyStyle={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              AI ADVISORY ACCEPTANCE
            </span>
            <CheckCircle size={14} color="var(--green)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--green)' }}>
              {acceptanceRate}%
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>({acceptedCount} ACCEPTED)</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Badge size="sm" variant="green">DISPATCHER CONCURRENCE</Badge>
          </div>
        </Panel>

        {/* Overrides */}
        <Panel bodyStyle={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              DISPATCHER OVERRIDES
            </span>
            <XCircle size={14} color="var(--red)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: overrideCount > 0 ? 'var(--red)' : 'var(--text)' }}>
              {overrideCount}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>MANUAL OVERRULES</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Badge size="sm" variant={overrideCount > 0 ? 'red' : 'neutral'}>
              {overrideCount > 0 ? 'JUSTIFICATIONS LOGGED' : 'ZERO OVERRIDES'}
            </Badge>
          </div>
        </Panel>

        {/* Modifications */}
        <Panel bodyStyle={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              SCHEDULE MODIFICATIONS
            </span>
            <Edit3 size={14} color="var(--amber)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: modifyCount > 0 ? 'var(--amber)' : 'var(--text)' }}>
              {modifyCount}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>HOLD PARAMETER EDITS</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Badge size="sm" variant={modifyCount > 0 ? 'amber' : 'neutral'}>
              OPERATOR REFINEMENTS
            </Badge>
          </div>
        </Panel>
      </div>

      {/* ========================================================= */}
      {/* Filter and Search Bar                                     */}
      {/* ========================================================= */}
      <Panel
        title="IMMUTABLE DISPATCH LOG ENTRIES"
        subtitle={`Displaying ${filteredRecords.length} of ${totalDecisions} permanent decision events`}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Filter by ID, train, resource, justification..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  padding: '4px 8px 4px 26px',
                  borderRadius: 'var(--radius-sharp)',
                  outline: 'none',
                  width: '260px',
                }}
              />
            </div>

            {/* Decision Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sharp)',
                outline: 'none',
              }}
            >
              <option value="ALL">ALL DECISION TYPES</option>
              <option value="ACCEPT">ACCEPT ONLY</option>
              <option value="OVERRIDE">OVERRIDE ONLY</option>
              <option value="MODIFY">MODIFY ONLY</option>
            </select>

            {/* Time Filter */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sharp)',
                outline: 'none',
              }}
            >
              <option value="ALL">ALL TIMESTAMPS</option>
              <option value="LAST_1H">LAST 1 HOUR</option>
            </select>
          </div>
        }
        bodyStyle={{ padding: 0 }}
      >
        {isAuditError ? (
          <div style={{ padding: '16px' }}>
            <ErrorPanel
              title="IMMUTABLE LEDGER OFFLINE"
              message="Failed to read controller decision audit records from backend."
              error={auditError}
              onRetry={refetchAudit}
            />
          </div>
        ) : (
          <div className="ops-table-container">
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'var(--subtle-bg)',
                    color: 'var(--text-muted)',
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '9px 14px' }}>TIMESTAMP (UTC)</th>
                  <th style={{ padding: '9px 14px' }}>DECISION ID</th>
                  <th style={{ padding: '9px 14px' }}>DECISION TYPE</th>
                  <th style={{ padding: '9px 14px' }}>RESOURCE</th>
                  <th style={{ padding: '9px 14px' }}>TRAINS INVOLVED</th>
                  <th style={{ padding: '9px 14px' }}>ACTION</th>
                  <th style={{ padding: '9px 14px' }}>DELAY OUTCOME</th>
                  <th style={{ padding: '9px 14px' }}>RATIONALE</th>
                </tr>
              </thead>
              <tbody>
                {isAuditLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '16px' }}>
                      <SkeletonTable rows={7} columns={8} />
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No audit records found matching query.
                    </td>
                  </tr>
                ) : (
                filteredRecords.map((r, idx) => {
                  const rec = r.recommendation || {};
                  const conf = r.conflict || {};
                  const trainIds = conf.trains || [];
                  const tA = trainsMap[trainIds[0]] || { train_number: trainIds[0] || 'Train A' };
                  const tB = trainsMap[trainIds[1]] || { train_number: trainIds[1] || 'Train B' };
                  const targetObj = trainsMap[rec.target_train_id] || { train_number: rec.target_train_id || 'Target' };

                  return (
                    <tr
                      key={r.decision_id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--row-zebra)',
                        transition: 'background-color 100ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--panel-hover)')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'var(--row-zebra)')
                      }
                    >
                      {/* Timestamp */}
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                        {formatTimestamp(r.timestamp)}
                      </td>

                      {/* Decision ID & Controller */}
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ color: 'var(--text)', fontWeight: 600 }}>{r.decision_id}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                          OPERATOR: {r.controller_id}
                        </div>
                      </td>

                      {/* Decision Type */}
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {getDecisionBadge(r.decision_type)}
                      </td>

                      {/* Resource */}
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            backgroundColor: 'var(--chip-bg)',
                            padding: '2px 6px',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sharp)',
                            color: 'var(--text)',
                          }}
                        >
                          {conf.resource_id || 'N/A'}
                        </span>
                      </td>

                      {/* Trains Involved */}
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: 'var(--text)' }}>{tA.train_number}</span>
                          <span style={{ color: 'var(--text-dim)' }}>vs</span>
                          <span style={{ color: 'var(--text)' }}>{tB.train_number}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ color: 'var(--text)' }}>
                          {rec.action_type ? rec.action_type.replace(/_/g, ' ') : 'N/A'}
                        </div>
                        {rec.target_train_id && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                            TARGET: {targetObj.train_number}
                          </div>
                        )}
                      </td>

                      {/* Hold & Delay Outcome */}
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ color: 'var(--amber)', fontWeight: 600 }}>
                          {rec.hold_minutes ? `+${rec.hold_minutes}m hold` : '0m hold'}
                        </div>
                        {rec.projected_delay_delta && (
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
                            {Object.entries(rec.projected_delay_delta).map(([tid, d]) => `${trainsMap[tid]?.train_number || tid}: +${d}m`).join(' | ')}
                          </div>
                        )}
                      </td>

                      {/* Rationale & Override Justification */}
                      <td style={{ padding: '10px 14px', maxWidth: '340px' }}>
                        {r.override_action && (
                          <div
                            style={{
                              backgroundColor: 'rgba(229, 72, 77, 0.08)',
                              border: '1px solid rgba(229, 72, 77, 0.3)',
                              borderRadius: 'var(--radius-sharp)',
                              padding: '4px 6px',
                              marginBottom: '4px',
                              fontSize: '0.68rem',
                              color: 'var(--text)',
                            }}
                          >
                            <span style={{ color: 'var(--red)', fontWeight: 700 }}>OPERATOR JUSTIFICATION: </span>
                            {r.override_action}
                          </div>
                        )}
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                          {rec.rationale || 'Advisory rationale record archived.'}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}
      </Panel>
    </div>
  );
}
