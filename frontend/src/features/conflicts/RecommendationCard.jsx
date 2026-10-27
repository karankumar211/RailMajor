import React, { useRef, useEffect, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Edit3,
  Clock,
  ArrowRight,
  ShieldAlert,
  Terminal,
  Zap,
} from 'lucide-react';
import { Panel, Badge, Button } from '../../components';
import { slideInFromRight, settleAccept } from '../../lib/gsapAnimations';

export function RecommendationCard({
  rec,
  conflict,
  trainsMap = {},
  onAccept,
  onOverride,
  onModify,
  isProcessing = false,
  isResolved = false,
  recordedDecision = null,
}) {
  const cardRef = useRef(null);
  const [showModify, setShowModify] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [modifiedHoldMinutes, setModifiedHoldMinutes] = useState(rec.hold_minutes);
  const [overrideReason, setOverrideReason] = useState('');

  // Animate card entrance
  useEffect(() => {
    if (cardRef.current) {
      slideInFromRight(cardRef.current);
    }
  }, [rec.rec_id]);

  const targetTrain = trainsMap[rec.target_train] || { train_number: rec.target_train, priority_class: 'Train' };
  const isRank1 = rec.rank === 1;

  const handleAcceptClick = () => {
    settleAccept(cardRef.current, () => {
      onAccept(rec.rec_id);
    });
  };

  const handleModifyConfirm = () => {
    settleAccept(cardRef.current, () => {
      onModify(rec.rec_id, modifiedHoldMinutes);
      setShowModify(false);
    });
  };

  const handleOverrideConfirm = () => {
    settleAccept(cardRef.current, () => {
      onOverride(rec.rec_id, overrideReason || 'Dispatcher manual override');
      setShowOverride(false);
    });
  };

  return (
    <div ref={cardRef} style={{ marginBottom: '16px' }}>
      <Panel
        style={{
          borderLeft: isRank1 ? '3px solid var(--amber)' : '3px solid var(--blue)',
          backgroundColor: isResolved ? 'rgba(61, 214, 140, 0.05)' : 'var(--panel)',
          borderColor: isResolved ? 'var(--green)' : 'var(--border)',
        }}
        title={`RANK #${rec.rank}: ${isRank1 ? 'RECOMMENDED ACTION' : 'ALTERNATIVE OPTION'}`}
        action={
          <div style={{ display: 'flex', gap: '6px' }}>
            <Badge variant={isRank1 ? 'amber' : 'blue'}>
              {rec.action_type.replace(/_/g, ' ')}
            </Badge>
            {isResolved && (
              <Badge variant="green">
                {recordedDecision?.decision_type || 'RESOLVED'}
              </Badge>
            )}
          </div>
        }
      >
        {/* Target Train & Action Headline */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              ACTION TARGET:
            </span>{' '}
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text)' }}>
              {targetTrain.priority_class} {targetTrain.train_number}
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            <Clock size={13} color="var(--amber)" />
            <span style={{ color: 'var(--amber)', fontWeight: 700 }}>
              {rec.hold_minutes} MINS HOLD
            </span>
          </div>
        </div>

        {/* Plain-Language Rationale Box */}
        <div
          style={{
            backgroundColor: 'var(--subtle-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sharp)',
            padding: '10px 12px',
            marginBottom: '14px',
          }}
        >
          <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>
            AI RATIONALE
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.45 }}>
            {rec.rationale}
          </p>
        </div>

        {/* Projected Delay Delta Breakdown */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px' }}>
            PROJECTED SCHEDULE IMPACT:
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '8px',
            }}
          >
            {Object.entries(rec.projected_delay_delta_minutes || {}).map(([tId, deltaMins]) => {
              const trainObj = trainsMap[tId] || { train_number: tId, priority_class: 'Train' };
              const isHeld = deltaMins > 0;
              return (
                <div
                  key={tId}
                  style={{
                    backgroundColor: 'var(--row-zebra)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sharp)',
                    padding: '8px 10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text)' }}>
                      {trainObj.train_number}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
                      {trainObj.priority_class}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: isHeld ? 'var(--amber)' : 'var(--green)',
                    }}
                  >
                    {isHeld ? `+${deltaMins}m` : '+0m (CLEARED)'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inline Modify Form */}
        {showModify && (
          <div
            style={{
              padding: '12px',
              backgroundColor: 'rgba(217, 119, 6, 0.06)',
              border: '1px solid var(--amber)',
              borderRadius: 'var(--radius-sharp)',
              marginBottom: '14px',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--amber)', marginBottom: '8px' }}>
              MODIFY HOLD DURATION BEFORE DISPATCHING:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                min="1"
                max="180"
                value={modifiedHoldMinutes}
                onChange={(e) => setModifiedHoldMinutes(parseInt(e.target.value) || 1)}
                style={{
                  width: '90px',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '6px 10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-sharp)',
                }}
              />
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                minutes on loop/signal
              </span>
              <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                <Button size="sm" variant="success" onClick={handleModifyConfirm} disabled={isProcessing}>
                  CONFIRM & DISPATCH
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setShowModify(false)}>
                  CANCEL
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Inline Override Form */}
        {showOverride && (
          <div
            style={{
              padding: '12px',
              backgroundColor: 'rgba(220, 38, 38, 0.06)',
              border: '1px solid var(--red)',
              borderRadius: 'var(--radius-sharp)',
              marginBottom: '14px',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--red)', marginBottom: '6px' }}>
              OVERRIDE DISPATCH DECISION JUSTIFICATION:
            </div>
            <input
              type="text"
              placeholder="e.g. Controller priority override: special rake movement scheduled..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '6px 10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                borderRadius: 'var(--radius-sharp)',
                marginBottom: '10px',
              }}
            />
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <Button size="sm" variant="danger" onClick={handleOverrideConfirm} disabled={isProcessing}>
                SUBMIT CONTROLLER OVERRIDE
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowOverride(false)}>
                CANCEL
              </Button>
            </div>
          </div>
        )}

        {/* Controller Decision Actions Bar */}
        {!isResolved ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '12px',
              borderTop: '1px solid var(--border)',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <Button
              variant="success"
              onClick={handleAcceptClick}
              disabled={isProcessing}
              icon={<CheckCircle size={14} />}
            >
              ACCEPT RECOMMENDATION
            </Button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowModify(!showModify);
                  setShowOverride(false);
                }}
                disabled={isProcessing}
                icon={<Edit3 size={13} />}
              >
                MODIFY HOLD
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setShowOverride(!showOverride);
                  setShowModify(false);
                }}
                disabled={isProcessing}
                icon={<ShieldAlert size={13} />}
              >
                OVERRIDE
              </Button>
            </div>
          </div>
        ) : (
          <div
            style={{
              paddingTop: '10px',
              borderTop: '1px solid var(--green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={15} color="var(--green)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--green)', fontWeight: 600 }}>
                DECISION RECORDED (ID: {recordedDecision?.decision_id || 'COMMITTED'})
              </span>
            </div>
            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              IMMUTABLE AUDIT LOG ENTRY CREATED
            </span>
          </div>
        )}
      </Panel>
    </div>
  );
}

export default RecommendationCard;
