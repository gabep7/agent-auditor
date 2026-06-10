import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, ChevronRight, ChevronDown, Download, BarChart3, TrendingUp } from 'lucide-react';
import { listAudits, getAudit } from '../lib/api';
import ScoreRing from '../components/ScoreRing';
import RadarChart from '../components/RadarChart';
import AttackTimeline from '../components/AttackTimeline';

const API_BASE = window.location.port === '5173'
  ? `${window.location.protocol}//${window.location.hostname}:8000/api`
  : '/api';

function TrendChart({ audits }) {
  if (audits.length < 2) return null;

  const data = audits.slice().reverse();
  const maxScore = 100;
  const w = 500, h = 120, pad = { top: 8, bottom: 20, left: 36, right: 8 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const xScale = (i) => pad.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v) => pad.top + chartH - (v / maxScore) * chartH;

  const line = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(0)} ${yScale(d.score || 0).toFixed(0)}`)
    .join(' ');

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-3.5 h-3.5 text-white/20" />
        <span className="text-[10px] font-medium text-white/25 uppercase tracking-wider">Score Trend</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-h-28">
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 50, 100].map(v => (
          <g key={v}>
            <line x1={pad.left} y1={yScale(v)} x2={w - pad.right} y2={yScale(v)}
              stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <text x={pad.left - 4} y={yScale(v) + 3} textAnchor="end"
              fill="rgba(255,255,255,0.12)" fontSize="8" fontFamily="'JetBrains Mono', monospace">
              {v}
            </text>
          </g>
        ))}

        <path d={`${line} L ${xScale(data.length - 1)} ${yScale(0)} L ${xScale(0)} ${yScale(0)} Z`}
          fill="url(#trend-fill)" />
        <path d={line} fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

        {data.map((d, i) => (
          <g key={i}>
            <circle cx={xScale(i)} cy={yScale(d.score || 0)} r="2.5"
              fill="#4ade80" stroke="#09090b" strokeWidth="1.5" />
            <text x={xScale(i)} y={h - 2} textAnchor="middle"
              fill="rgba(255,255,255,0.12)" fontSize="6" fontFamily="'JetBrains Mono', monospace">
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
      <div className="animate-pulse space-y-3">
        <div className="h-6 w-40 bg-white/[0.04] rounded" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-white/[0.02] rounded-lg animate-shimmer" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-base font-semibold text-white">Audit Reports</h1>
            <p className="text-xs text-neon-red mt-1">{error}</p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              setRefreshIndex(value => value + 1);
            }}
            className="btn-ghost"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-semibold text-white">Audit Reports</h1>
          <p className="text-xs text-white/20 mt-0.5">
            {audits.length > 0 ? `${audits.length} audit${audits.length > 1 ? 's' : ''}` : 'No audits yet'}
          </p>
        </div>
      </div>

      <TrendChart audits={audits} />

      {audits.length === 0 && (
        <div className="text-center py-20">
          <BarChart3 className="w-8 h-8 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No audits yet</p>
          <p className="text-white/15 text-xs mt-1">Run your first audit to see reports here</p>
        </div>
      )}

      <div className="space-y-1">
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
                className="flex items-center gap-4 py-3 px-2 rounded-lg hover:bg-white/[0.02] transition-colors cursor-pointer group animate-slide-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <ScoreRing score={score} size={44} strokeWidth={3} label="" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white/70">{audit.agent}</span>
                    <span className="text-[10px] text-white/15 font-mono">#{audit.id}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px]">
                    <span className="text-neon-red/70">{audit.vulnerabilities} vulns</span>
                    <span className="text-white/15">
                      {audit.completed ? new Date(audit.completed).toLocaleDateString() : 'In progress'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {audit.completed && (
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={`${API_BASE}/audit/${audit.id}/pdf`} download
                        className="text-[10px] text-white/20 hover:text-white/40"
                        onClick={e => e.stopPropagation()}>
                        PDF
                      </a>
                      <a href={`${API_BASE}/audit/${audit.id}/export`} download
                        className="text-[10px] text-white/20 hover:text-white/40"
                        onClick={e => e.stopPropagation()}>
                        JSON
                      </a>
                    </div>
                  )}
                  {isExpanded
                    ? <ChevronDown className="w-3.5 h-3.5 text-white/20" />
                    : <ChevronRight className="w-3.5 h-3.5 text-white/10 group-hover:text-white/25 transition-colors" />
                  }
                </div>
              </div>

              {isExpanded && (
                <div className="ml-14 py-4 animate-fade-in">
                  {detailLoading ? (
                    <div className="text-xs text-white/15 py-2">Loading...</div>
                  ) : detailData ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-6">
                        {detailData.category_scores && Object.keys(detailData.category_scores).length > 0 && (
                          <RadarChart scores={detailData.category_scores} size={130} />
                        )}
                        <div className="flex-1">
                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div>
                              <div className="text-xl font-bold text-neon-green">{detailData.overall_score || 0}</div>
                              <div className="text-[10px] text-white/20">Score</div>
                            </div>
                            <div>
                              <div className="text-xl font-bold text-neon-red">{detailData.vulnerabilities_found || 0}</div>
                              <div className="text-[10px] text-white/20">Vulnerabilities</div>
                            </div>
                            <div>
                              <div className="text-xl font-bold text-white/60">{detailData.scenarios_run || 0}</div>
                              <div className="text-[10px] text-white/20">Scenarios</div>
                            </div>
                          </div>
                          {detailData.critical_findings?.length > 0 && (
                            <div>
                              <div className="text-[10px] text-neon-red/60 font-medium mb-1">Critical Findings</div>
                              {detailData.critical_findings.slice(0, 3).map((f, j) => (
                                <div key={j} className="text-[11px] text-white/30 leading-relaxed">{f}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {detailData.scenarios?.length > 0 && (
                        <div>
                          <div className="text-[10px] text-white/15 uppercase tracking-wider mb-2">
                            Scenarios ({detailData.scenarios.length})
                          </div>
                          <div className="space-y-1.5 max-h-72 overflow-y-auto">
                            {detailData.scenarios.map((s, j) => (
                              <AttackTimeline key={j} scenario={s} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-white/15 py-2">No details available</div>
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
