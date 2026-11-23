import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  CloudRain,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  useGetConflictsQuery,
  useGetRecommendationsQuery,
  usePostSimulateMutation,
  useGetSectionStateQuery,
} from '../features/api/apiSlice';
import { Panel, Badge, Button, Skeleton, SkeletonPanel, ErrorPanel } from '../components';

export default function SimulationPage() {
  const navigate = useNavigate();

  const {
    data: conflicts = [],
    isLoading: isConflictsLoading,
    isError: isConflictsError,
    error: conflictsError,
    refetch: refetchConflicts,
  } = useGetConflictsQuery('default');
  const { data: sectionData } = useGetSectionStateQuery('default');
  const [postSimulate, { isLoading: isSimulating }] = usePostSimulateMutation();

  const [selectedConflictId, setSelectedConflictId] = useState('');
  const [activeTab, setActiveTab] = useState('recommendations'); // 'recommendations' | 'manual'
  const [simulationResult, setSimulationResult] = useState(null);

  // Manual What-If Form State
  const [targetTrainId, setTargetTrainId] = useState('');
  const [actionType, setActionType] = useState('HOLD_AT_LOOP');
  const [holdMinutes, setHoldMinutes] = useState(30);

  // Live Weather Disruption State (Open-Meteo)
  const [weatherData, setWeatherData] = useState(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);

  // Cache trains map
  const trainsMap = {};
  (sectionData?.trains || []).forEach((t) => {
    trainsMap[t.train_id] = t;
  });

  // Auto-select first conflict if none selected
  useEffect(() => {
    if (!selectedConflictId && conflicts.length > 0) {
      setSelectedConflictId(conflicts[0].conflict_id);
    }
  }, [conflicts, selectedConflictId]);

  const selectedConflict = conflicts.find((c) => c.conflict_id === selectedConflictId);

  // Auto-set default target train when conflict changes
  useEffect(() => {
    if (selectedConflict && selectedConflict.trains?.length > 0) {
      setTargetTrainId(selectedConflict.trains[0]);
    }
  }, [selectedConflict]);

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

  // Execute Simulation
  const handleRunSimulation = async (actType, tTrain, hMins) => {
    try {
      const res = await postSimulate({
        conflict_id: selectedConflictId,
        action_type: actType,
        target_train: tTrain,
        hold_minutes: hMins,
      }).unwrap();
      setSimulationResult(res);
    } catch (err) {
      console.error('Simulation failed:', err);
    }
  };

  // Fetch real keyless weather from Open-Meteo for New Delhi / NCR Corridor
  const handleFetchOpenMeteoWeather = async () => {
    setIsFetchingWeather(true);
    try {
      const resp = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&current=temperature_2m,precipitation,weather_code,wind_speed_10m'
      );
      const data = await resp.json();
      const current = data.current || {};
      const rain = current.precipitation || 0;
      const wind = current.wind_speed_10m || 0;

      // Invert weather to delay: rain > 0 or high wind produces speed restriction delay
      let injectedMinutes = 15;
      let weatherDescription = 'Overcast / High Wind speed restriction';
      if (rain > 0) {
        injectedMinutes = Math.min(60, 20 + Math.round(rain * 10));
        weatherDescription = `Rainfall detected (${rain}mm) -> Wet rail braking distance expansion`;
      } else if (wind > 15) {
        injectedMinutes = 20;
        weatherDescription = `High gusts (${wind} km/h) -> OHE pantograph speed ceiling`;
      } else {
        injectedMinutes = 15;
        weatherDescription = `Nominal trackside conditions (Temp ${current.temperature_2m || 24}°C)`;
      }

      setWeatherData({
        temp: current.temperature_2m,
        rain,
        wind,
        description: weatherDescription,
        injectedMinutes,
      });

      // Auto-populate holdMinutes
      setHoldMinutes(injectedMinutes);
      setActiveTab('manual');
    } catch (err) {
      console.error('Failed to query Open-Meteo:', err);
    } finally {
      setIsFetchingWeather(false);
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ========================================================= */}
      {/* Top Banner: Informational Exploratory Mode                */}
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
            What-if simulation
          </h1>
          <Badge variant="blue" size="sm" dot>
            Exploratory
          </Badge>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleFetchOpenMeteoWeather}
            disabled={isFetchingWeather}
            icon={<CloudRain size={13} color="var(--blue)" />}
          >
            {isFetchingWeather ? 'Querying weather...' : 'Fetch weather'}
          </Button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2-Column Split Layout                                     */}
      {/* ========================================================= */}
      <div
        className="ops-split-grid"
        style={{
          minHeight: '520px',
        }}
      >
        {/* ------------------------------------------------------- */}
        {/* Left Column: Simulation Configuration Deck              */}
        {/* ------------------------------------------------------- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Target Conflict Selector */}
          <Panel title="Target conflict" subtitle="Choose active conflict to explore resolution outcomes">
            {isConflictsLoading ? (
              <div style={{ padding: '8px 0' }}>
                <Skeleton height="36px" width="100%" />
              </div>
            ) : isConflictsError ? (
              <ErrorPanel
                title="CONFLICTS DATA OFFLINE"
                message="Failed to load active conflict queue for simulation."
                error={conflictsError}
                onRetry={refetchConflicts}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <select
                  value={selectedConflictId}
                  onChange={(e) => {
                    setSelectedConflictId(e.target.value);
                    setSimulationResult(null);
                  }}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sharp)',
                    outline: 'none',
                  }}
                >
                  {conflicts.map((c) => {
                    const tA = trainsMap[c.trains[0]]?.train_number || c.trains[0];
                    const tB = trainsMap[c.trains[1]]?.train_number || c.trains[1];
                    return (
                      <option key={c.conflict_id} value={c.conflict_id}>
                        {c.resource_id} &bull; ({tA} vs {tB}) [{c.window?.duration_minutes}m]
                      </option>
                    );
                  })}
                </select>

                {selectedConflict && (
                  <div
                    style={{
                      backgroundColor: 'var(--chip-bg)',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sharp)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <div>RESOURCE: <strong style={{ color: 'var(--text)' }}>{selectedConflict.resource_id}</strong></div>
                    <div>WINDOW: {selectedConflict.window?.start?.slice(11, 16)} &rarr; {selectedConflict.window?.end?.slice(11, 16)} ({selectedConflict.window?.duration_minutes}m overlap)</div>
                    <div>TRAINS: {selectedConflict.trains?.join(', ')}</div>
                  </div>
                )}
              </div>
            )}
          </Panel>

          {/* Mode Switcher Tabs */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('recommendations')}
              style={{
                flex: 1,
                padding: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: activeTab === 'recommendations' ? 'var(--blue)' : 'var(--border)',
                backgroundColor: activeTab === 'recommendations' ? 'rgba(79, 163, 227, 0.12)' : 'var(--panel)',
                color: activeTab === 'recommendations' ? 'var(--blue)' : 'var(--text-muted)',
                borderRadius: 'var(--radius-sharp)',
                cursor: 'pointer',
              }}
            >
              PREVIEW AI ADVICE
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              style={{
                flex: 1,
                padding: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: activeTab === 'manual' ? 'var(--blue)' : 'var(--border)',
                backgroundColor: activeTab === 'manual' ? 'rgba(79, 163, 227, 0.12)' : 'var(--panel)',
                color: activeTab === 'manual' ? 'var(--blue)' : 'var(--text-muted)',
                borderRadius: 'var(--radius-sharp)',
                cursor: 'pointer',
              }}
            >
              CUSTOM WHAT-IF
            </button>
          </div>

          {/* Mode A: Preview AI Recommendations */}
          {activeTab === 'recommendations' && (
            <Panel title="2. CANDIDATE ADVICE PREVIEW" subtitle="Forecast outcome of AI generated recommendations">
              {isRecsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <SkeletonPanel height="110px" />
                  <SkeletonPanel height="110px" />
                </div>
              ) : isRecsError ? (
                <ErrorPanel
                  title="RECOMMENDATIONS OFFLINE"
                  message="Failed to load AI recommendations for this conflict."
                  error={recsError}
                  onRetry={refetchRecs}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(recsPayload?.recommendations || []).map((rec) => {
                    const targetObj = trainsMap[rec.target_train] || { train_number: rec.target_train, priority_class: 'Train' };
                    return (
                      <div
                        key={rec.rec_id}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sharp)',
                          padding: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <Badge size="sm" variant={rec.rank === 1 ? 'amber' : 'neutral'}>
                            RANK #{rec.rank} &bull; {rec.action_type.replace(/_/g, ' ')}
                          </Badge>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--amber)', fontWeight: 600 }}>
                            +{rec.hold_minutes}m
                          </span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text)', marginBottom: '4px' }}>
                          Hold target: <strong>{targetObj.priority_class} {targetObj.train_number}</strong>
                        </div>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.3 }}>
                          {rec.rationale}
                        </p>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleRunSimulation(rec.action_type, rec.target_train, rec.hold_minutes)}
                          disabled={isSimulating}
                          icon={<Play size={11} />}
                          style={{ width: '100%' }}
                        >
                          SIMULATE THIS CANDIDATE
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          )}

          {/* Mode B: Manual What-If Form */}
          {activeTab === 'manual' && (
            <Panel title="2. HYPOTHETICAL ACTION BUILDER" subtitle="Construct arbitrary dispatch parameters to test">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Target Train */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    TARGET TRAIN:
                  </label>
                  <select
                    value={targetTrainId}
                    onChange={(e) => setTargetTrainId(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sharp)',
                    }}
                  >
                    {selectedConflict?.trains?.map((tId) => {
                      const tObj = trainsMap[tId] || { train_number: tId, priority_class: 'Train' };
                      return (
                        <option key={tId} value={tId}>
                          {tObj.priority_class} {tObj.train_number} ({tId})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Action Type */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    ACTION TYPE:
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sharp)',
                    }}
                  >
                    <option value="HOLD_AT_LOOP">HOLD AT STATION LOOP LINE</option>
                    <option value="HOLD_BEFORE_BLOCK">HOLD BEFORE BLOCK SECTION</option>
                    <option value="PROCEED">PROCEED CLEARED</option>
                  </select>
                </div>

                {/* Hold Duration */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    HOLD DURATION (MINUTES):
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={holdMinutes}
                      onChange={(e) => setHoldMinutes(parseInt(e.target.value) || 1)}
                      style={{
                        width: '80px',
                        backgroundColor: 'var(--bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        fontSize: '0.8rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sharp)',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {[5, 15, 30, 45].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setHoldMinutes(m)}
                          style={{
                            padding: '4px 8px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.68rem',
                            backgroundColor: holdMinutes === m ? 'var(--blue)' : 'var(--chip-bg)',
                            color: holdMinutes === m ? '#FFFFFF' : 'var(--text-muted)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sharp)',
                            cursor: 'pointer',
                          }}
                        >
                          +{m}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={() => handleRunSimulation(actionType, targetTrainId, holdMinutes)}
                  disabled={isSimulating}
                  icon={<Play size={13} />}
                >
                  {isSimulating ? 'SIMULATING...' : 'EXECUTE WHAT-IF PROJECTION'}
                </Button>
              </div>
            </Panel>
          )}

          {/* Open-Meteo Disruption Callout */}
          {weatherData && (
            <div
              style={{
                backgroundColor: 'rgba(79, 163, 227, 0.05)',
                border: '1px solid var(--blue)',
                borderRadius: 'var(--radius-panel)',
                padding: '10px 12px',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--blue)', fontWeight: 700, marginBottom: '4px' }}>
                <CloudRain size={13} />
                LIVE OPEN-METEO WEATHER DISRUPTION
              </div>
              <div style={{ color: 'var(--text)' }}>
                {weatherData.description} (Temp: {weatherData.temp}°C, Rain: {weatherData.rain}mm, Wind: {weatherData.wind} km/h)
              </div>
              <div style={{ color: 'var(--amber)', marginTop: '4px' }}>
                &bull; Injected Speed Restriction: +{weatherData.injectedMinutes} mins delay
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------- */}
        {/* Right Column: Projected State & Impact Forecast         */}
        {/* ------------------------------------------------------- */}
        <div>
          {simulationResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Impact Scorecard */}
              <Panel
                title="SIMULATION IMPACT SCORECARD"
                subtitle={`Projected forecast for ${simulationResult.action_type} on ${trainsMap[simulationResult.target_train]?.train_number || simulationResult.target_train} (${simulationResult.hold_minutes} mins)`}
                action={
                  <Button
                    variant="amber"
                    size="sm"
                    onClick={() => navigate(`/conflicts?conflictId=${simulationResult.conflict_id}`)}
                    icon={<ArrowRight size={13} />}
                  >
                    USE THIS IN CONFLICTS
                  </Button>
                }
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {/* Status */}
                  <div style={{ backgroundColor: 'var(--subtle-bg)', padding: '10px', borderRadius: 'var(--radius-sharp)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      ORIGINAL CONFLICT STATUS
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <Badge
                        size="md"
                        variant={simulationResult.original_conflict_resolved ? 'green' : 'red'}
                        dot
                      >
                        {simulationResult.projected_delay_summary?.original_conflict_status || 'UNKNOWN'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      {simulationResult.original_conflict_resolved
                        ? 'Hold clears original headway window.'
                        : 'Hold insufficient; overlap still persists.'}
                    </div>
                  </div>

                  {/* Added Delay */}
                  <div style={{ backgroundColor: 'var(--subtle-bg)', padding: '10px', borderRadius: 'var(--radius-sharp)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      ADDED TRAIN DELAY
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--amber)', marginTop: '2px' }}>
                      +{simulationResult.projected_delay_summary?.total_added_delay_minutes}m
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Accumulated timetable shift
                    </div>
                  </div>

                  {/* Downstream Conflicts Introduced */}
                  <div style={{ backgroundColor: 'var(--subtle-bg)', padding: '10px', borderRadius: 'var(--radius-sharp)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      NEW CONFLICTS INTRODUCED
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: (simulationResult.projected_delay_summary?.new_conflicts_count || 0) > 0 ? 'var(--red)' : 'var(--green)',
                        marginTop: '2px',
                      }}
                    >
                      {simulationResult.projected_delay_summary?.new_conflicts_count || 0}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {(simulationResult.projected_delay_summary?.new_conflicts_count || 0) > 0 ? 'Cascading secondary overlaps' : 'Clean dispatch action'}
                    </div>
                  </div>
                </div>
              </Panel>

              {/* Alert Callout for New Conflicts Introduced */}
              {(simulationResult.projected_delay_summary?.new_conflicts_introduced?.length || 0) > 0 ? (
                <div
                  style={{
                    backgroundColor: 'rgba(229, 72, 77, 0.1)',
                    border: '1px solid var(--red)',
                    borderRadius: 'var(--radius-panel)',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px' }}>
                    <AlertTriangle size={15} />
                    CASCADING SECONDARY CONFLICTS INTRODUCED ({simulationResult.projected_delay_summary.new_conflicts_count} DOWNSTREAM OVERLAPS)
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text)', marginBottom: '10px' }}>
                    Warning: Applying this {simulationResult.hold_minutes}m hold resolves or alters the immediate conflict, but delays the target train into the scheduled path of {simulationResult.projected_delay_summary.new_conflicts_count} other trains downstream:
                  </p>
                  <div className="ops-table-container">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left' }}>
                          <th style={{ padding: '4px 8px' }}>RESOURCE</th>
                          <th style={{ padding: '4px 8px' }}>CONFLICTING TRAIN</th>
                          <th style={{ padding: '4px 8px' }}>CLASS</th>
                          <th style={{ padding: '4px 8px' }}>WINDOW</th>
                          <th style={{ padding: '4px 8px' }}>OVERLAP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simulationResult.projected_delay_summary.new_conflicts_introduced.map((nc, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '5px 8px', color: 'var(--text)' }}>{nc.resource_id}</td>
                            <td style={{ padding: '5px 8px', color: 'var(--red)', fontWeight: 600 }}>{nc.conflicting_train_number}</td>
                            <td style={{ padding: '5px 8px' }}>
                              <Badge size="sm" variant={nc.conflicting_train_priority === 'Rajdhani' ? 'amber' : 'neutral'}>
                                {nc.conflicting_train_priority}
                              </Badge>
                            </td>
                            <td style={{ padding: '5px 8px', color: 'var(--text-muted)' }}>{nc.window_start} &rarr; {nc.window_end}</td>
                            <td style={{ padding: '5px 8px', color: 'var(--red)', fontWeight: 700 }}>+{nc.overlap_minutes}m</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: 'rgba(61, 214, 140, 0.08)',
                    border: '1px solid var(--green)',
                    borderRadius: 'var(--radius-panel)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <CheckCircle2 size={18} color="var(--green)" />
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--green)', fontWeight: 700 }}>
                      CLEAN DISPATCH ACTION CONFIRMED
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Forward timetable projection detected 0 new downstream conflicts. The hold clears section occupancy cleanly.
                    </div>
                  </div>
                </div>
              )}

              {/* Revised Timetable Comparison Table */}
              <Panel
                title="REVISED TRAIN TIMELINE"
                bodyStyle={{ padding: 0 }}
              >
                <div className="ops-table-container" style={{ maxHeight: '340px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', fontFamily: 'var(--font-mono)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--subtle-bg)', color: 'var(--text-muted)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px' }}>SEQ</th>
                        <th style={{ padding: '8px 12px' }}>RESOURCE</th>
                        <th style={{ padding: '8px 12px' }}>TYPE</th>
                        <th style={{ padding: '8px 12px' }}>ORIGINAL SCHEDULE</th>
                        <th style={{ padding: '8px 12px' }}>PROJECTED SCHEDULE</th>
                        <th style={{ padding: '8px 12px' }}>DELAY &Delta;</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulationResult.projected_state?.map((ps) => {
                        const hasDelay = ps.delay_delta_minutes > 0;
                        return (
                          <tr key={ps.schedule_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '7px 12px', color: 'var(--text-dim)' }}>#{ps.sequence_order}</td>
                            <td style={{ padding: '7px 12px', fontWeight: 600, color: 'var(--text)' }}>{ps.resource_id}</td>
                            <td style={{ padding: '7px 12px' }}>
                              <Badge size="sm" variant={ps.resource_type === 'platform' ? 'blue' : 'neutral'}>
                                {ps.resource_type}
                              </Badge>
                            </td>
                            <td style={{ padding: '7px 12px', color: 'var(--text-muted)' }}>
                              {ps.original_arrival?.slice(11, 16)} &rarr; {ps.original_departure?.slice(11, 16)}
                            </td>
                            <td style={{ padding: '7px 12px', color: hasDelay ? 'var(--amber)' : 'var(--green)', fontWeight: 600 }}>
                              {ps.projected_arrival?.slice(11, 16)} &rarr; {ps.projected_departure?.slice(11, 16)}
                            </td>
                            <td style={{ padding: '7px 12px', color: hasDelay ? 'var(--amber)' : 'var(--green)', fontWeight: 700 }}>
                              {hasDelay ? `+${ps.delay_delta_minutes}m` : '+0m'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          ) : (
            <Panel style={{ padding: '40px', textAlign: 'center' }}>
              <Sliders size={32} color="var(--blue)" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.96rem', color: 'var(--text)', marginBottom: '6px' }}>
                EXPLORATORY SIMULATION STANDBY
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', maxWidth: '480px', margin: '0 auto' }}>
                Select an active conflict and execute either a recommended candidate preview or construct a manual what-if action on the left panel to forecast downstream timetable shifts and conflict propagation.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
