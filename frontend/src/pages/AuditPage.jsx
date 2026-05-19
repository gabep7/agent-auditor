import { useState, useRef, useEffect } from 'react';
import {
  Shield, Play, Terminal, AlertTriangle, CheckCircle, XCircle,
  Activity, Zap, Target, Globe, Building, ExternalLink, Brain,
  ShieldAlert, Crosshair, Download,
} from 'lucide-react';
import { streamAudit, runBenchmark, getAuditRules } from '../lib/api';
import RadarChart from '../components/RadarChart';
import ScoreRing from '../components/ScoreRing';
import RuleHeatmap from '../components/RuleHeatmap';
import AttackTimeline from '../components/AttackTimeline';

const VICTIM_TYPES = [
  { id: 'customer_support', name: 'Customer Support', desc: 'SaaS agent — no validation, follows any command', icon: Target, risk: 'High Risk' },
  { id: 'banking', name: 'Banking Assistant', desc: 'Finance agent — sends money, reveals PII', icon: Zap, risk: 'Critical Risk' },
  { id: 'enterprise_support', name: 'Enterprise Support', desc: 'Properly built — validates and resists attacks', icon: Building, risk: 'Low Risk' },
  { id: 'custom', name: 'Custom URL', desc: 'Your own agent — test any endpoint', icon: Globe, risk: 'Unknown' },
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

    addLog('system', '🚀 Agent Auditor initialized');
    addLog('system', `🎯 Target: ${victimType} (${targetUrl})`);

    const ctrl = streamAudit(targetUrl, victimType, 6, {
      onProgress(data) {
        if (data.step === 'register' || data.step === 'registered' || data.step === 'generating' || data.step === 'generated') {
          addLog('system', data.message);
        } else if (data.step === 'introspecting' || data.step === 'introspected') {
          addLog('info', `🧠 ${data.message}`);
        } else if (data.step === 'attacker_ready') {
          addLog('attack', `⚔️ ${data.message}`);
        } else if (data.step === 'executing') {
          setProgress({ current: data.current, total: data.total, message: data.message });
          addLog('attack', data.message);
        } else if (data.step === 'finalizing') {
          addLog('system', `📊 ${data.message}`);
        } else {
          addLog('system', data.message);
        }
      },
      onScenario(data) {
        setScenarioResults(prev => [...prev, data]);
        if (data.vulnerability_found) {
          addLog('warning', `  🔴 VULNERABLE — ${data.name}`);
        } else {
          addLog('success', `  🟢 Safe — ${data.name}`);
        }
      },
      onComplete(data) {
        setReport(data);
        setComplete(true);
        setRunning(false);
        addLog('system', '');
        addLog('success', `════════════════════════════════`);
        addLog('success', `  AUDIT COMPLETE`);
        addLog('success', `  Score: ${data.overall_score}/100 | Vulnerabilities: ${data.vulnerabilities_found}/${data.scenarios_run}`);
        addLog('success', `════════════════════════════════`);
        // Fetch rule analysis for enterprise victim audits
        if (victimType === 'enterprise_support' && data.audit_id) {
          setRuleLoading(true);
          getAuditRules(data.audit_id)
            .then(setRuleData)
            .catch(console.error)
            .finally(() => setRuleLoading(false));
        }
      },
      onError(err) {
        addLog('error', `❌ Audit failed: ${err.message}`);
        setRunning(false);
      },
    });

    setController(ctrl);
  }

  function startBenchmark() {
    setBenchmarkRunning(true);
    setBenchmarkResults(null);
    setLog([]);

    addLog('system', '🏆 Security Benchmark starting...');
    addLog('system', 'Testing: Customer Support, Banking, Enterprise Support\n');

    const ctrl = runBenchmark({
      victims: ['customer_support', 'banking', 'enterprise_support'],
      scenarioCount: 3,
      onProgress(data) {
        if (data.step === 'benchmark_start') {
          setProgress({ current: 0, total: data.total_tests || 18, message: data.message });
          addLog('system', `📊 ${data.message}`);
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
        addLog('success', '════════════════════════════════');
        addLog('success', '  BENCHMARK COMPLETE');
        data.comparison.forEach(v => {
          const icon = v.overall_score >= 70 ? '🟢' : v.overall_score >= 40 ? '🟡' : '🔴';
          addLog('success', `  ${icon} ${v.victim_name}: ${v.overall_score}/100 (${v.vulnerabilities} vulnerabilities)`);
        });
        addLog('success', `  🏆 Winner: ${data.winner.victim_name} with ${data.winner.overall_score}/100`);
        addLog('success', '════════════════════════════════');
      },
      onError(err) {
        addLog('error', `❌ Benchmark failed: ${err.message}`);
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
      addLog('error', '⛔ Operation cancelled by user');
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
    setProgress({ current: 0, total: 0, message: '' });
    setLog([]);
  }

  function addLog(type, message) {
    setLog(prev => [...prev, { type, message, time: new Date().toLocaleTimeString() }]);
  }

  const vulnCount = scenarioResults.filter(s => s.vulnerability_found).length;
  const safeCount = scenarioResults.filter(s => !s.vulnerability_found).length;

  // ─── HERO STATE (before audit) ─────────────────────────────

  if (!running && !benchmarkRunning && !complete && scenarioResults.length === 0) {
    return (
      <div className="h-full flex flex-col max-h-[calc(100vh-3rem)] animate-fade-in">
        {/* Hero section */}
        <div className="text-center py-8">
          <div className="inline-flex p-4 rounded-2xl bg-neon-green/5 border border-neon-green/10 mb-4 animate-float">
            <Shield className="w-12 h-12 text-neon-green" />
          </div>
          <h1 className="text-3xl font-extrabold text-auditor-100 mb-2 tracking-tight">
            Agent <span className="text-neon-green text-glow-green">Auditor</span>
          </h1>
          <p className="text-sm text-auditor-400 max-w-md mx-auto leading-relaxed">
            Adversarial red-team testing for AI agents. Find vulnerabilities before attackers do.
            Powered by Gemini LLM-as-judge and Arize Phoenix tracing.
          </p>
        </div>

        {/* Target selector */}
        <div className="max-w-2xl mx-auto w-full">
          <div className="text-xs text-auditor-500 uppercase tracking-wider mb-3 font-semibold flex items-center gap-2">
            <Crosshair className="w-3.5 h-3.5" />
            Select Target Agent
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {VICTIM_TYPES.map(v => {
              const Icon = v.icon;
              const active = victimType === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setVictimType(v.id)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 group ${
                    active
                      ? 'glass border-neon-green/30 glow-green'
                      : 'glass hover:border-auditor-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className={`p-1.5 rounded-lg ${active ? 'bg-neon-green/15' : 'bg-auditor-700/50'}`}>
                      <Icon className={`w-4 h-4 ${active ? 'text-neon-green' : 'text-auditor-500 group-hover:text-auditor-300'}`} />
                    </div>
                    <span className={`text-sm font-bold ${active ? 'text-neon-green' : 'text-auditor-200'}`}>{v.name}</span>
                  </div>
                  <div className="text-[11px] text-auditor-500 leading-relaxed mb-2">{v.desc}</div>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                    v.risk === 'Critical Risk' ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : v.risk === 'High Risk' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    : v.risk === 'Low Risk' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-auditor-700/50 text-auditor-500 border border-auditor-600'
                  }`}>
                    {v.risk}
                  </span>
                </button>
              );
            })}
          </div>

          {isCustom && (
            <input
              type="text"
              value={customUrl}
              onChange={e => setCustomUrl(e.target.value)}
              className="w-full glass rounded-xl px-4 py-3 text-sm text-auditor-200 font-mono placeholder-auditor-500 focus:outline-none focus:border-neon-green/40 mb-4 transition-colors"
              placeholder="https://your-agent-endpoint/chat"
            />
          )}

          <div className="flex gap-3">
            <button onClick={runAudit} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-3">
              <Play className="w-4 h-4" />
              Launch Audit — 6 Scenarios
            </button>
            <button
              onClick={startBenchmark}
              disabled={running || benchmarkRunning}
              className="px-4 py-3 rounded-xl text-sm font-semibold border backdrop-blur-sm transition-all duration-200
                bg-neon-blue/10 border-neon-blue/30 text-neon-blue hover:bg-neon-blue/20
                disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              Benchmark All — 9 Tests
            </button>
          </div>
          <p className="mt-3 text-[10px] text-auditor-500 leading-relaxed">
            Demo preset: runs fewer scenarios to keep latency and cloud/API usage low. The backend supports larger audits for production runs.
          </p>
        </div>
      </div>
    );
  }

  // ─── BENCHMARK RESULTS ─────────────────────────────────────

  if (benchmarkResults && benchmarkResults.comparison) {
    return (
      <div className="h-full flex flex-col max-h-[calc(100vh-3rem)] animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-neon-blue/10 border border-neon-blue/20">
            <Activity className="w-5 h-5 text-neon-blue" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-auditor-100">Security Benchmark</h1>
            <p className="text-xs text-auditor-500">Side-by-side comparison of all built-in agents</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neon-green/10 border border-neon-green/20">
              <span className="text-[10px] text-neon-green font-semibold">🏆 {benchmarkResults.winner?.victim_name}</span>
            </div>
            <button
              onClick={resetAuditState}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-auditor-700/50 border border-auditor-600 text-auditor-300 hover:bg-auditor-600/50 transition-colors"
            >
              Back
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {benchmarkResults.comparison.map((v) => {
            const score = v.overall_score || 0;
            const isWinner = v.victim_id === benchmarkResults.winner?.victim_id;
            return (
              <div
                key={v.victim_id}
                className={`glass rounded-xl p-5 text-center transition-all duration-200 ${
                  isWinner ? 'border-neon-green/40 ring-1 ring-neon-green/30' : 'hover:border-auditor-500/50'
                }`}
              >
                {isWinner && (
                  <div className="text-[9px] font-bold text-neon-green uppercase tracking-wider mb-2">🏆 Winner</div>
                )}
                <ScoreRing score={score} size={96} strokeWidth={6} label="" />
                <h3 className="text-sm font-bold text-auditor-200 mt-3">{v.victim_name}</h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className={`text-[11px] font-mono font-bold ${score >= 70 ? 'text-neon-green' : score >= 40 ? 'text-neon-yellow' : 'text-neon-red'}`}>
                    {score}/100
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-auditor-500">Vulnerabilities</span>
                    <span className="text-neon-red font-semibold">{v.vulnerabilities}/{v.total_tests}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-auditor-500">Risk Level</span>
                    <span className={`font-semibold ${
                      score >= 70 ? 'text-neon-green' : score >= 40 ? 'text-neon-yellow' : 'text-neon-red'
                    }`}>
                      {score >= 70 ? 'Low' : score >= 40 ? 'Medium' : 'High'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Log */}
        <div ref={logRef} className="flex-1 glass rounded-xl p-3 overflow-y-auto font-mono text-xs space-y-1 min-h-0">
          {log.map((entry, i) => (
            <div key={i} className={`${
              entry.type === 'error' ? 'text-neon-red' :
              entry.type === 'warning' ? 'text-neon-yellow' :
              entry.type === 'success' ? 'text-neon-green' :
              entry.type === 'attack' ? 'text-neon-orange' :
              'text-auditor-400'
            }`}>
              <span className="text-auditor-600">[{entry.time}]</span> {entry.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── RUNNING / COMPLETE STATE ──────────────────────────────

  return (
    <div className="h-full flex flex-col max-h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${running ? 'bg-neon-yellow/10 border border-neon-yellow/20' : 'bg-neon-green/10 border border-neon-green/20'}`}>
            <Shield className={`w-5 h-5 ${running ? 'text-neon-yellow' : 'text-neon-green'}`} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-auditor-100">Agent Auditor</h1>
            <p className="text-[11px] text-auditor-500">
              {benchmarkRunning ? 'Benchmarking built-in agents...' : running ? `Attacking ${victimType}...` : `Audit of ${victimType} complete`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(running || benchmarkRunning) && (
            <span className="flex items-center gap-2 text-[11px] text-neon-yellow">
              <span className="w-2 h-2 rounded-full bg-neon-yellow animate-blink" />
              {progress.current}/{progress.total} {benchmarkRunning ? 'attacks' : 'scenarios'}
            </span>
          )}
          {(running || benchmarkRunning) ? (
            <button onClick={cancelAudit} className="btn-danger flex items-center gap-2 text-xs py-2 px-4">
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </button>
          ) : (
            <button
              onClick={resetAuditState}
              className="btn-primary flex items-center gap-2 text-xs py-2 px-4"
            >
              <Play className="w-3.5 h-3.5" /> New Audit
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(running || benchmarkRunning) && progress.total > 0 && (
        <div className="mb-4 animate-fade-in">
          <div className="h-1.5 bg-auditor-800 rounded-full overflow-hidden glass">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${(progress.current / progress.total) * 100}%`,
                background: 'linear-gradient(90deg, #00ff88, #00ddff)',
              }}
            />
          </div>
        </div>
      )}

      {/* Dual panels */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* Left: Attack log */}
        <div className="glass rounded-xl flex flex-col scan-line relative overflow-hidden">
          <div className="p-3 border-b border-auditor-600/50 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-neon-green" />
            <span className="text-xs font-bold text-auditor-300 tracking-wide">ATTACK CONSOLE</span>
            {(running || benchmarkRunning) && (
              <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold bg-neon-red/10 border border-neon-red/20 text-neon-red animate-blink">
                LIVE
              </span>
            )}
          </div>
          <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs">
            {log.length === 0 && (
              <div className="text-auditor-500 flex items-center gap-2">
                <Activity className="w-3 h-3" />
                Initializing attack vectors...
              </div>
            )}
            {log.map((entry, i) => (
              <div key={i} className={`flex gap-2 leading-relaxed ${
                entry.type === 'error' ? 'text-neon-red' :
                entry.type === 'success' ? 'text-neon-green' :
                entry.type === 'warning' ? 'text-neon-yellow' :
                entry.type === 'attack' ? 'text-neon-blue' :
                entry.type === 'info' ? 'text-neon-purple' :
                'text-auditor-400'
              }`}>
                <span className="text-auditor-600 flex-shrink-0 select-none">[{entry.time}]</span>
                <span>{entry.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Findings */}
        <div className="glass rounded-xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-auditor-600/50 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-neon-yellow" />
            <span className="text-xs font-bold text-auditor-300 tracking-wide">FINDINGS</span>
            <div className="ml-auto flex items-center gap-2">
              {vulnCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-neon-red/10 border border-neon-red/20 text-neon-red">
                  {vulnCount} vuln
                </span>
              )}
              {safeCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-neon-green/10 border border-neon-green/20 text-neon-green">
                  {safeCount} safe
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {scenarioResults.length === 0 && !benchmarkRunning && (
              <div className="text-auditor-500 text-xs flex items-center gap-2 py-4 justify-center">
                <Activity className="w-3 h-3" />
                Waiting for scenario results...
              </div>
            )}

            {benchmarkRunning && (
              <div className="text-auditor-400 text-xs flex flex-col items-center gap-2 py-8 justify-center text-center">
                <Activity className="w-4 h-4 text-neon-blue animate-pulse" />
                <div className="font-semibold text-auditor-300">Benchmark running</div>
                <div className="max-w-xs leading-relaxed">
                  Reusing the same generated attacks against Customer Support, Banking Assistant, and Enterprise Support.
                </div>
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
        <div className="mt-4 glass rounded-xl p-4 animate-slide-up">
          <div className="flex items-start gap-6">
            {/* Score ring */}
            <div className="flex-shrink-0">
              <ScoreRing score={report.overall_score || 0} size={120} strokeWidth={8} />
            </div>

            {/* Radar chart */}
            {report.category_scores && Object.keys(report.category_scores).length > 0 && (
              <div className="flex-shrink-0">
                <RadarChart scores={report.category_scores} size={180} />
              </div>
            )}

            {/* Rule heatmap for enterprise victim */}
            {victimType === 'enterprise_support' && (
              <div className="flex-shrink-0 w-64">
                <RuleHeatmap data={ruleData} loading={ruleLoading} />
              </div>
            )}

            {/* Stats + badges */}
            <div className="flex-1 min-w-0">
              {/* Verdict */}
              <div className={`text-sm font-bold mb-3 ${
                (report.overall_score || 100) < 40 ? 'text-neon-red text-glow-red'
                : (report.overall_score || 100) < 70 ? 'text-neon-yellow'
                : 'text-neon-green text-glow-green'
              }`}>
                {report.verdict}
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mb-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="w-3 h-3 text-neon-red" />
                  <span className="text-auditor-400">Vulnerabilities:</span>
                  <span className="text-neon-red font-bold">{report.vulnerabilities_found}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Terminal className="w-3 h-3 text-neon-blue" />
                  <span className="text-auditor-400">Scenarios:</span>
                  <span className="text-auditor-200 font-bold">{report.scenarios_run}</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {report.phoenix_project_url && (
                  <a
                    href={report.phoenix_project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-neon-blue/10 border border-neon-blue/20 text-neon-blue hover:bg-neon-blue/20 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Traces in Phoenix
                  </a>
                )}
                {report.evals_logged_count != null && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-neon-green/10 border border-neon-green/20 text-neon-green">
                    <CheckCircle className="w-3 h-3" />
                    {report.evals_logged_count} {report.judge_mode === 'heuristic_fallback' ? 'heuristic evals' : 'LLM-as-judge evals'}
                  </span>
                )}
                {report.audit_id && (
                  <>
                    <a
                      href={`${import.meta.env.VITE_API_URL || (window.location.port === '5173' ? `${window.location.protocol}//${window.location.hostname}:8000/api` : '/api')}/audit/${report.audit_id}/pdf`}
                      download
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-neon-blue/10 border border-neon-blue/20 text-neon-blue hover:bg-neon-blue/20 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download PDF
                    </a>
                    <a
                      href={`${import.meta.env.VITE_API_URL || (window.location.port === '5173' ? `${window.location.protocol}//${window.location.hostname}:8000/api` : '/api')}/audit/${report.audit_id}/export`}
                      download
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-auditor-700/50 border border-auditor-600 text-auditor-400 hover:bg-auditor-600/50 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      JSON
                    </a>
                  </>
                )}
                {report.mcp_introspection_used && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan">
                    <Zap className="w-3 h-3" />
                    Phoenix MCP Active
                  </span>
                )}
                {report.self_improvement && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-neon-purple/10 border border-neon-purple/20 text-neon-purple">
                    <Brain className="w-3 h-3" />
                    {report.self_improvement.patterns_learned} patterns from {report.self_improvement.past_audits_seen} past audits
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Analysis */}
          {report.analysis && (
            <div className="mt-4 bg-auditor-900/50 border border-auditor-700/50 rounded-xl p-4">
              <div className="text-[10px] text-auditor-500 uppercase tracking-wider mb-2 font-semibold">AI Analysis</div>
              <div className="text-xs text-auditor-300 leading-relaxed whitespace-pre-line">{report.analysis}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
