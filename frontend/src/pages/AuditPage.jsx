import { useState, useRef, useEffect } from 'react';
import {
  Shield, Play, Terminal, AlertTriangle, XCircle,
  Activity, Zap, Target, Globe, Building, ExternalLink, Brain,
  ShieldAlert, Crosshair, Download, ScanEye,
} from 'lucide-react';
import { streamAudit, runBenchmark, getAuditRules, getAuditOwasp } from '../lib/api';
import RadarChart from '../components/RadarChart';
import ScoreRing from '../components/ScoreRing';
import RuleHeatmap from '../components/RuleHeatmap';
import AttackTimeline from '../components/AttackTimeline';

const VICTIM_TYPES = [
  { id: 'customer_support', name: 'Customer Support', desc: 'SaaS agent: no validation, follows any command', icon: Target, risk: 'High' },
  { id: 'banking', name: 'Banking', desc: 'Finance agent: sends money, reveals PII', icon: Zap, risk: 'Critical' },
  { id: 'enterprise_support', name: 'Enterprise', desc: 'Properly built: validates and resists attacks', icon: Building, risk: 'Low' },
  { id: 'custom', name: 'Custom URL', desc: 'Test any endpoint', icon: Globe, risk: '?' },
];

export default function AuditPage() {
  const [victimType, setVictimType] = useState('customer_support');
  const [customUrl, setCustomUrl] = useState('http://localhost:8000/api/victim/customer_support');
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [log, setLog] = useState([]);
  const [scenarioResults, setScenarioResults] = useState([]);
  const [report, setReport] = useState(null);
  const [controller, setController] = useState(null);
  const [benchmarkResults, setBenchmarkResults] = useState(null);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [ruleData, setRuleData] = useState(null);
  const [ruleLoading, setRuleLoading] = useState(false);
  const [owaspData, setOwaspData] = useState(null);
  const [owaspLoading, setOwaspLoading] = useState(false);
  const logRef = useRef(null);

  const isCustom = victimType === 'custom';
  const apiBase = import.meta.env.VITE_API_URL
    || (window.location.port === '5173'
      ? `${window.location.protocol}//${window.location.hostname}:8000/api`
      : `${window.location.origin}/api`);
  const targetUrl = isCustom ? customUrl : `${apiBase}/victim/${victimType}`;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [log]);

  function runAudit() {
    setRunning(true);
    setComplete(false);
    setLog([]);
    setScenarioResults([]);
    setReport(null);
    setProgress({ current: 0, total: 0, message: '' });

    addLog('system', 'Agent Auditor initialized');
    addLog('system', `Target: ${victimType} (${targetUrl})`);

    const ctrl = streamAudit(targetUrl, victimType, 1, {
      onProgress(data) {
        if (data.step === 'register' || data.step === 'registered' || data.step === 'generating' || data.step === 'generated') {
          addLog('system', data.message);
        } else if (data.step === 'introspecting' || data.step === 'introspected') {
          addLog('info', `${data.message}`);
        } else if (data.step === 'attacker_ready') {
          addLog('attack', `${data.message}`);
        } else if (data.step === 'executing') {
          setProgress({ current: data.current, total: data.total, message: data.message });
          addLog('attack', data.message);
        } else if (data.step === 'finalizing') {
          addLog('system', `${data.message}`);
        } else {
          addLog('system', data.message);
        }
      },
      onScenario(data) {
        setScenarioResults(prev => [...prev, data]);
        if (data.vulnerability_found) {
          addLog('warning', `  vulnerable - ${data.name}`);
        } else {
          addLog('success', `  safe - ${data.name}`);
        }
      },
      onComplete(data) {
        setReport(data);
        setComplete(true);
        setRunning(false);
        addLog('system', '');
        addLog('success', `================================`);
        addLog('success', `  AUDIT COMPLETE`);
        addLog('success', `  Score: ${data.overall_score}/100 | Vulnerabilities: ${data.vulnerabilities_found}/${data.scenarios_run}`);
        addLog('success', `================================`);
        if (victimType === 'enterprise_support' && data.audit_id) {
          setRuleLoading(true);
          getAuditRules(data.audit_id)
            .then(setRuleData)
            .catch(console.error)
            .finally(() => setRuleLoading(false));
        }
        if (data.audit_id) {
          setOwaspLoading(true);
          getAuditOwasp(data.audit_id)
            .then(setOwaspData)
            .catch(console.error)
            .finally(() => setOwaspLoading(false));
        }
      },
      onError(err) {
        addLog('error', `Audit failed: ${err.message}`);
        setRunning(false);
      },
    });

    setController(ctrl);
  }

  function startBenchmark() {
    setBenchmarkRunning(true);
    setBenchmarkResults(null);
    setLog([]);

    addLog('system', 'Security benchmark starting...');
    addLog('system', 'Testing: Customer Support, Banking, Enterprise Support\n');

    const ctrl = runBenchmark({
      victims: ['customer_support', 'banking', 'enterprise_support'],
      scenarioCount: 1,
      onProgress(data) {
        if (data.step === 'benchmark_start') {
          setProgress({ current: 0, total: data.total_tests || 18, message: data.message });
          addLog('system', `${data.message}`);
        } else if (data.step === 'executing') {
          setProgress({
            current: data.current || 0,
            total: data.total || 18,
            message: data.message || 'Running benchmark...',
          });
          addLog('attack', `  ${data.message}`);
        }
      },
      onComplete(data) {
        setBenchmarkResults(data);
        setBenchmarkRunning(false);
        addLog('system', '');
        addLog('success', '================================');
        addLog('success', '  BENCHMARK COMPLETE');
        data.comparison.forEach(v => {
          const label = v.overall_score >= 70 ? 'pass' : v.overall_score >= 40 ? 'warn' : 'fail';
          addLog('success', `  ${label} ${v.victim_name}: ${v.overall_score}/100 (${v.vulnerabilities} vulnerabilities)`);
        });
        addLog('success', `  winner: ${data.winner.victim_name} with ${data.winner.overall_score}/100`);
        addLog('success', '================================');
      },
      onError(err) {
        addLog('error', `Benchmark failed: ${err.message}`);
        setBenchmarkRunning(false);
      },
    });

    setController(ctrl);
  }

  function cancelAudit() {
    if (controller) {
      controller.abort();
      setRunning(false);
      setBenchmarkRunning(false);
      addLog('error', 'Operation cancelled by user');
    }
  }

  function resetAuditState() {
    setRunning(false);
    setComplete(false);
    setBenchmarkRunning(false);
    setBenchmarkResults(null);
    setScenarioResults([]);
    setReport(null);
    setRuleData(null);
    setRuleLoading(false);
    setOwaspData(null);
    setOwaspLoading(false);
    setProgress({ current: 0, total: 0, message: '' });
    setLog([]);
  }

  function addLog(type, message) {
    setLog(prev => [...prev, { type, message, time: new Date().toLocaleTimeString() }]);
  }

  const vulnCount = scenarioResults.filter(s => s.vulnerability_found).length;
  const safeCount = scenarioResults.filter(s => !s.vulnerability_found).length;
  const selectedVictim = VICTIM_TYPES.find(v => v.id === victimType) || VICTIM_TYPES[0];

  // Hero state (before audit)
  if (!running && !benchmarkRunning && !complete && scenarioResults.length === 0) {
    const SelectedIcon = selectedVictim.icon;

    return (
      <div className="flex min-h-full flex-col justify-center animate-fade-in max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <ScanEye className="w-8 h-8 text-white/60" />
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Agent Auditor</h1>
            <p className="mt-1 text-base text-white/40">
              Red-team AI agents, score failures, generate evidence-backed audits.
            </p>
          </div>
        </div>

        {/* Target selector */}
        <div className="mb-6">
          <div className="text-xs font-medium uppercase tracking-wider text-white/25 mb-3">Select target</div>
          <div className="grid grid-cols-2 gap-3">
            {VICTIM_TYPES.map(v => {
              const Icon = v.icon;
              const active = victimType === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setVictimType(v.id)}
                  className={`flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all duration-100 ${
                    active
                      ? 'bg-white/[0.08] ring-1 ring-white/10'
                      : 'bg-white/[0.02] hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${active ? 'text-white' : 'text-white/25'}`} />
                  <div className="min-w-0">
                    <div className={`text-sm font-semibold ${active ? 'text-white' : 'text-white/50'}`}>{v.name}</div>
                    <div className="text-xs text-white/25 mt-0.5 truncate">{v.desc}</div>
                  </div>
                  <span className={`ml-auto text-xs font-medium whitespace-nowrap ${active ? 'text-white/40' : 'text-white/15'}`}>{v.risk}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom URL */}
        {isCustom && (
          <input
            type="text"
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            className="w-full rounded-xl bg-white/[0.04] px-5 py-3.5 text-sm text-white font-mono placeholder-white/15 focus:outline-none focus:ring-1 focus:ring-white/15 mb-6"
            placeholder="https://your-agent-endpoint/chat"
          />
        )}

        {/* Actions */}
        <div className="flex gap-3 mb-8">
          <button onClick={runAudit} className="btn-primary flex items-center gap-2.5">
            <Play className="w-5 h-5" />
            Launch Audit
          </button>
          <button
            onClick={startBenchmark}
            disabled={running || benchmarkRunning}
            className="btn-ghost flex items-center gap-2.5"
          >
            <Activity className="w-5 h-5" />
            Benchmark All
          </button>
        </div>

        {/* Info row */}
        <div className="flex gap-12 text-sm">
          <div>
            <div className="text-white/20 mb-1 text-xs font-medium uppercase tracking-wider">Endpoint</div>
            <div className="text-white/40 font-mono text-xs truncate max-w-xs">{targetUrl}</div>
          </div>
          <div>
            <div className="text-white/20 mb-1 text-xs font-medium uppercase tracking-wider">Audit path</div>
            <div className="text-white/40">Recon → Adaptive attack → LLM judge</div>
          </div>
          <div>
            <div className="text-white/20 mb-1 text-xs font-medium uppercase tracking-wider">Output</div>
            <div className="text-white/40">PDF + JSON + Phoenix traces</div>
          </div>
        </div>
      </div>
    );
  }

  // Benchmark results
  if (benchmarkResults && benchmarkResults.comparison) {
    return (
      <div className="h-full flex flex-col max-h-[calc(100vh-2rem)] animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-white">Security Benchmark</h1>
            <span className="text-xs text-white/25">Winner: {benchmarkResults.winner?.victim_name}</span>
          </div>
          <button onClick={resetAuditState} className="btn-ghost">
            Back
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          {benchmarkResults.comparison.map((v) => {
            const score = v.overall_score || 0;
            const isWinner = v.victim_id === benchmarkResults.winner?.victim_id;
            return (
              <div key={v.victim_id} className="text-center py-4">
                {isWinner && (
                  <div className="text-[9px] font-semibold text-neon-green uppercase tracking-wider mb-3">Winner</div>
                )}
                <div className="flex justify-center mb-3">
                  <ScoreRing score={score} size={88} strokeWidth={5} label="" />
                </div>
                <div className="text-sm font-medium text-white">{v.victim_name}</div>
                <div className={`text-xs font-semibold mt-1 ${score >= 70 ? 'text-neon-green' : score >= 40 ? 'text-neon-yellow' : 'text-neon-red'}`}>
                  {score}/100
                </div>
                <div className="text-[11px] text-white/25 mt-1">
                  {v.vulnerabilities}/{v.total_tests} vulnerabilities
                </div>
              </div>
            );
          })}
        </div>

        <div ref={logRef} className="flex-1 overflow-y-auto font-mono text-xs space-y-0.5 min-h-0">
          {log.map((entry, i) => (
            <div key={i} className={`py-0.5 ${
              entry.type === 'error' ? 'text-neon-red' :
              entry.type === 'warning' ? 'text-neon-yellow' :
              entry.type === 'success' ? 'text-neon-green' :
              entry.type === 'attack' ? 'text-neon-orange' :
              'text-white/30'
            }`}>
              <span className="text-white/15 mr-2">[{entry.time}]</span>{entry.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- RUNNING / COMPLETE STATE ------------------------------
  return (
    <div className="h-full flex flex-col max-h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-white">
            {benchmarkRunning ? 'Benchmarking...' : running ? `Attacking ${victimType}` : 'Audit Complete'}
          </h1>
          {(running || benchmarkRunning) && (
            <span className="flex items-center gap-1.5 text-xs text-white/30">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-yellow animate-blink" />
              {progress.current}/{progress.total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(running || benchmarkRunning) ? (
            <button onClick={cancelAudit} className="btn-danger">
              Cancel
            </button>
          ) : (
            <button onClick={resetAuditState} className="btn-primary">
              New Audit
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(running || benchmarkRunning) && progress.total > 0 && (
        <div className="mb-4">
          <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-white/40 transition-all duration-500 ease-out"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Dual panels */}
      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
        {/* Left: Attack log */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-3.5 h-3.5 text-white/25" />
            <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Console</span>
            {(running || benchmarkRunning) && (
              <span className="ml-auto text-[9px] font-medium text-neon-red animate-blink">LIVE</span>
            )}
          </div>
          <div ref={logRef} className="flex-1 overflow-y-auto font-mono text-xs space-y-0.5 min-h-0">
            {log.length === 0 && (
              <div className="flex items-center gap-2 text-white/15 py-6">
                <Activity className="w-3.5 h-3.5" />
                <span>Initializing attack vectors...</span>
              </div>
            )}
            {log.map((entry, i) => (
              <div key={i} className={`py-0.5 ${
                entry.type === 'error' ? 'text-neon-red' :
                entry.type === 'success' ? 'text-neon-green' :
                entry.type === 'warning' ? 'text-neon-yellow' :
                entry.type === 'attack' ? 'text-neon-blue' :
                entry.type === 'info' ? 'text-neon-purple' :
                'text-white/30'
              }`}>
                <span className="text-white/10 mr-2">[{entry.time}]</span>{entry.message}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Findings */}
        <div className="flex flex-col min-h-0 border-l border-white/[0.06] pl-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-3.5 h-3.5 text-white/25" />
            <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Findings</span>
            <div className="ml-auto flex items-center gap-2">
              {vulnCount > 0 && (
                <span className="text-[10px] text-neon-red">{vulnCount} vuln</span>
              )}
              {safeCount > 0 && (
                <span className="text-[10px] text-neon-green">{safeCount} safe</span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {scenarioResults.length === 0 && !benchmarkRunning && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="w-6 h-6 text-white/10 mb-2" />
                <span className="text-xs text-white/20">Findings will appear here as scenarios complete</span>
              </div>
            )}

            {benchmarkRunning && scenarioResults.length === 0 && (
              <div className="flex items-center gap-2 text-white/20 text-xs py-6">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>Running benchmark across all agents...</span>
              </div>
            )}

            {scenarioResults.map((s, i) => (
              <AttackTimeline key={i} scenario={s} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Results dashboard */}
      {report && (
        <div className="mt-6 pt-6 border-t border-white/[0.06] animate-slide-up">
          <div className="flex items-start gap-8">
            {/* Score ring */}
            <div className="flex-shrink-0">
              <ScoreRing score={report.overall_score || 0} size={90} strokeWidth={5} />
            </div>

            {/* Radar chart */}
            {report.category_scores && Object.keys(report.category_scores).length > 0 && (
              <div className="flex-shrink-0">
                <RadarChart scores={report.category_scores} size={150} />
              </div>
            )}

            {/* Rule heatmap */}
            {victimType === 'enterprise_support' && (
              <div className="flex-shrink-0 w-52">
                <RuleHeatmap data={ruleData} loading={ruleLoading} />
              </div>
            )}

            {/* OWASP mapping */}
            {owaspData && owaspData.owasp_classes && owaspData.owasp_classes.length > 0 && (
              <div className="flex-shrink-0 w-44">
                <div className="text-[10px] text-white/20 uppercase tracking-wider mb-2 font-medium">OWASP LLM Top 10</div>
                <div className="space-y-1.5">
                  {owaspData.owasp_classes.slice(0, 4).map((cls) => (
                    <div key={cls.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-neon-red">{cls.id}</span>
                        <span className="text-[10px] text-white/40">{cls.name}</span>
                      </div>
                      <span className="text-[9px] text-white/20">{cls.vulnerability_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats + badges */}
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-semibold mb-3 ${
                (report.overall_score || 100) < 40 ? 'text-neon-red'
                : (report.overall_score || 100) < 70 ? 'text-neon-yellow'
                : 'text-neon-green'
              }`}>
                {report.verdict}
              </div>

              <div className="flex items-center gap-4 mb-3 text-xs">
                <span className="text-white/30">
                  <span className="text-neon-red font-semibold">{report.vulnerabilities_found}</span> vulnerabilities
                </span>
                <span className="text-white/30">
                  <span className="text-white font-semibold">{report.scenarios_run}</span> scenarios
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {report.phoenix_project_url && (
                  <a href={report.phoenix_project_url} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-neon-blue hover:underline">
                    Phoenix Traces ↗
                  </a>
                )}
                {report.audit_id && (
                  <>
                    <a href={`${apiBase}/audit/${report.audit_id}/pdf`} download
                      className="text-[11px] text-white/30 hover:text-white/50">
                      PDF ↓
                    </a>
                    <a href={`${apiBase}/audit/${report.audit_id}/export`} download
                      className="text-[11px] text-white/30 hover:text-white/50">
                      JSON ↓
                    </a>
                  </>
                )}
                {report.self_improvement && (
                  <span className="text-[11px] text-neon-purple">
                    {report.self_improvement.patterns_learned} patterns learned
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Analysis */}
          {report.analysis && (
            <div className="mt-5 pt-5 border-t border-white/[0.04]">
              <div className="text-[10px] text-white/20 uppercase tracking-wider mb-2 font-medium">Analysis</div>
              <div className="text-xs text-white/40 leading-relaxed whitespace-pre-line max-w-2xl">{report.analysis}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
