import { useState, useEffect } from 'react';
import { FileText, AlertTriangle, Clock, ChevronRight, ChevronDown, Download, BarChart3, TrendingUp, Shield } from 'lucide-react';
import { listAudits, getAudit } from '../lib/api';
import ScoreRing from '../components/ScoreRing';
import RadarChart from '../components/RadarChart';
import AttackTimeline from '../components/AttackTimeline';

const API_BASE = window.location.port === '5173'
  ? `${window.location.protocol}//${window.location.hostname}:8000/api`
  : '/api';

function TrendChart({ audits }) {
  if (audits.length < 2) return null;

  const data = audits.slice().reverse(); // chronological order
  const maxScore = 100;
  const w = 500, h = 140, pad = { top: 10, bottom: 25, left: 40, right: 10 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const xScale = (i) => pad.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v) => pad.top + chartH - (v / maxScore) * chartH;

  const line = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(0)} ${yScale(d.score || 0).toFixed(0)}`)
    .join(' ');

  const gradientId = 'trend-gradient';

  return (
    <div className="glass rounded-xl p-4 mb-6 animate-slide-up">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-neon-blue" />
        <span className="text-xs font-bold text-auditor-200 uppercase tracking-wider">Security Score Trend</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-h-36">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00ff88" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={pad.left} y1={yScale(v)} x2={w - pad.right} y2={yScale(v)}
              stroke="rgba(148,163,184,0.1)" strokeWidth="1" />
            <text x={pad.left - 6} y={yScale(v) + 3} textAnchor="end"
              fill="#64748b" fontSize="8" fontFamily="'JetBrains Mono', monospace">
              {v}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={`${line} L ${xScale(data.length - 1)} ${yScale(0)} L ${xScale(0)} ${yScale(0)} Z`}
          fill={`url(#${gradientId})`} />

        {/* Line */}
        <path d={line} fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round"
          strokeLinejoin="round" filter="url(#glow)" />

        {/* Data dots */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={xScale(i)} cy={yScale(d.score || 0)} r="3.5"
              fill="#00ff88" stroke="#0a0a1a" strokeWidth="1.5" />
            <text x={xScale(i)} y={h - 4} textAnchor="middle"
              fill="#64748b" fontSize="6" fontFamily="'JetBrains Mono', monospace">
              {d.completed ? new Date(d.completed).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function ReportPage({ active = true }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled || cancelled) return;
      setError('Reports took too long to load. Check that the backend is running on port 8000.');
      setLoading(false);
    }, 10000);

    listAudits()
      .then(data => {
        if (cancelled) return;
        setError(null);
        setAudits(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        if (cancelled) return;
        console.error(err);
        setError(err.message || 'Unable to load reports.');
      })
      .finally(() => {
        settled = true;
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [active, refreshIndex]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-auditor-700 rounded-lg" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 glass rounded-xl animate-shimmer" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-neon-blue/10 border border-neon-blue/20">
            <FileText className="w-5 h-5 text-neon-blue" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-auditor-100">Audit Reports</h1>
            <p className="text-xs text-neon-red">{error}</p>
          </div>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            setRefreshIndex(value => value + 1);
          }}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-neon-blue/10 border border-neon-blue/30 text-neon-blue hover:bg-neon-blue/20 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-neon-blue/10 border border-neon-blue/20">
          <FileText className="w-5 h-5 text-neon-blue" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-auditor-100">Audit Reports</h1>
          <p className="text-xs text-auditor-500">
            {audits.length > 0 ? `${audits.length} completed audit${audits.length > 1 ? 's' : ''}` : 'No audits yet'}
          </p>
        </div>
      </div>

      <TrendChart audits={audits} />

      {audits.length === 0 && (
        <div className="text-center py-20">
          <div className="inline-flex p-4 rounded-2xl bg-auditor-800/50 border border-auditor-700 mb-4">
            <BarChart3 className="w-10 h-10 text-auditor-600" />
          </div>
          <p className="text-auditor-400 font-medium">No audits yet</p>
          <p className="text-auditor-500 text-sm mt-1">Run your first audit to see reports here</p>
        </div>
      )}

      <div className="space-y-3">
        {audits.map((audit, i) => {
          const score = audit.score || 0;
          const isExpanded = expandedId === audit.id;

          function toggleExpand() {
            if (isExpanded) {
              setExpandedId(null);
              setDetailData(null);
              return;
            }
            setExpandedId(audit.id);
            setDetailLoading(true);
            getAudit(audit.id)
              .then(setDetailData)
              .catch(console.error)
              .finally(() => setDetailLoading(false));
          }

          return (
            <div key={audit.id}>
              <div
                onClick={toggleExpand}
                className={`glass rounded-xl p-5 hover:border-auditor-500/50 transition-all duration-200 animate-slide-up group cursor-pointer ${
                  isExpanded ? 'border-neon-green/30' : ''
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-5">
                  <div className="flex-shrink-0">
                    <ScoreRing score={score} size={72} strokeWidth={5} label="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-auditor-200">{audit.agent}</span>
                      <span className="text-[9px] text-auditor-600 font-mono">#{audit.id}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5 text-neon-red">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="font-semibold">{audit.vulnerabilities}</span>
                        <span className="text-auditor-500">vulnerabilities</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-auditor-400">
                        <Clock className="w-3 h-3" />
                        {audit.completed ? new Date(audit.completed).toLocaleDateString() : 'In progress'}
                      </div>
                    </div>
                    {audit.completed && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <a
                          href={`${API_BASE}/audit/${audit.id}/pdf`}
                          download
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium
                            bg-neon-blue/10 border border-neon-blue/30 text-neon-blue hover:bg-neon-blue/20 transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <Download className="w-2.5 h-2.5" />
                          PDF
                        </a>
                        <a
                          href={`${API_BASE}/audit/${audit.id}/export`}
                          download
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium
                            bg-auditor-700/50 border border-auditor-600 text-auditor-400 hover:bg-auditor-600/50 transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <Download className="w-2.5 h-2.5" />
                          JSON
                        </a>
                      </div>
                    )}
                  </div>
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-neon-green" />
                    : <ChevronRight className="w-4 h-4 text-auditor-600 group-hover:text-auditor-400 transition-colors" />
                  }
                </div>
              </div>

              {/* Detail panel */}
              {isExpanded && (
                <div className="mt-2 glass rounded-xl p-4 animate-fade-in border-l-2 border-neon-green/30">
                  {detailLoading ? (
                    <div className="text-xs text-auditor-500 py-4 text-center">Loading details...</div>
                  ) : detailData ? (
                    <div className="space-y-4">
                      {/* Summary row */}
                      <div className="flex items-start gap-6">
                        {detailData.category_scores && Object.keys(detailData.category_scores).length > 0 && (
                          <RadarChart scores={detailData.category_scores} size={150} />
                        )}
                        <div className="flex-1">
                          <div className="text-[10px] text-auditor-500 uppercase tracking-wider mb-2 font-semibold">Audit Summary</div>
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="glass rounded-lg p-2 text-center">
                              <div className="text-lg font-bold text-neon-green">{detailData.overall_score || 0}</div>
                              <div className="text-[9px] text-auditor-500">Score</div>
                            </div>
                            <div className="glass rounded-lg p-2 text-center">
                              <div className="text-lg font-bold text-neon-red">{detailData.vulnerabilities_found || 0}</div>
                              <div className="text-[9px] text-auditor-500">Vulnerabilities</div>
                            </div>
                            <div className="glass rounded-lg p-2 text-center">
                              <div className="text-lg font-bold text-auditor-200">{detailData.scenarios_run || 0}</div>
                              <div className="text-[9px] text-auditor-500">Scenarios</div>
                            </div>
                          </div>
                          {detailData.critical_findings && detailData.critical_findings.length > 0 && (
                            <div>
                              <div className="text-[10px] text-neon-red font-semibold mb-1">Critical Findings</div>
                              {detailData.critical_findings.slice(0, 3).map((f, j) => (
                                <div key={j} className="text-[10px] text-auditor-400 leading-relaxed">{f}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Scenario list */}
                      {detailData.scenarios && detailData.scenarios.length > 0 && (
                        <div>
                          <div className="text-[10px] text-auditor-500 uppercase tracking-wider mb-2 font-semibold">
                            Scenarios ({detailData.scenarios.length})
                          </div>
                          <div className="space-y-2 max-h-80 overflow-y-auto">
                            {detailData.scenarios.map((s, j) => (
                              <AttackTimeline key={j} scenario={s} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-auditor-500 py-4 text-center">No details available</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
