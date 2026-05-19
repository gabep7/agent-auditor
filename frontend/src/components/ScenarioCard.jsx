import { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldAlert, ShieldCheck, Zap } from 'lucide-react';

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-400' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-400' },
  medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  low: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-400' },
  info: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', dot: 'bg-slate-400' },
};

const CATEGORY_LABELS = {
  parameter_attack: 'Param Attack',
  prompt_injection: 'Prompt Injection',
  contradictory: 'Contradictory',
  edge_case: 'Edge Case',
  multi_turn: 'Multi-Turn',
  tool_misuse: 'Tool Misuse',
};

export default function ScenarioCard({ scenario, index }) {
  const [expanded, setExpanded] = useState(false);

  const sev = SEVERITY_COLORS[scenario.severity] || SEVERITY_COLORS.medium;
  const isVuln = scenario.vulnerability_found === true;
  const score = scenario.score != null ? Math.round(scenario.score) : null;

  return (
    <div
      className={`rounded-xl border backdrop-blur-sm transition-all duration-300 animate-slide-up ${
        isVuln
          ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
          : 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-start gap-3 text-left"
      >
        {/* Status icon */}
        <div className={`mt-0.5 p-1 rounded-lg ${isVuln ? 'bg-red-500/15' : 'bg-emerald-500/15'}`}>
          {isVuln
            ? <ShieldAlert className="w-4 h-4 text-red-400" />
            : <ShieldCheck className="w-4 h-4 text-emerald-400" />
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-auditor-200 truncate">{scenario.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${sev.bg} ${sev.border} ${sev.text} border`}>
              {scenario.severity?.toUpperCase()}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-auditor-700/50 border border-auditor-600 text-auditor-400">
              {CATEGORY_LABELS[scenario.category] || scenario.category}
            </span>
            {score != null && (
              <span className={`text-[9px] font-mono font-bold ${score < 40 ? 'text-red-400' : score < 70 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                {score}/100
              </span>
            )}
          </div>
          {/* Tool calls */}
          {scenario.tool_calls?.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <Zap className={`w-3 h-3 ${isVuln ? 'text-red-400' : 'text-auditor-500'}`} />
              <span className={`text-[10px] font-mono ${isVuln ? 'text-red-400' : 'text-auditor-500'}`}>
                {scenario.tool_calls.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Expand toggle */}
        <div className="text-auditor-500 mt-0.5">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-2 border-t border-auditor-700/50 mt-0">
          <div className="pt-2">
            <div className="text-[10px] text-auditor-500 uppercase tracking-wider mb-1">Attack Input</div>
            <div className="text-xs text-auditor-300 bg-auditor-900/50 rounded-lg p-2 font-mono leading-relaxed max-h-24 overflow-y-auto">
              {scenario.input}
            </div>
          </div>
          {scenario.target_response && (
            <div>
              <div className="text-[10px] text-auditor-500 uppercase tracking-wider mb-1">Target Response</div>
              <div className="text-xs text-auditor-300 bg-auditor-900/50 rounded-lg p-2 font-mono leading-relaxed max-h-24 overflow-y-auto">
                {scenario.target_response}
              </div>
            </div>
          )}
          {scenario.auditor_evaluation && (
            <div>
              <div className="text-[10px] text-auditor-500 uppercase tracking-wider mb-1">
                <span className="text-neon-blue">LLM Judge</span> Reasoning
              </div>
              <div className="text-xs text-auditor-300 bg-neon-blue/5 border border-neon-blue/10 rounded-lg p-2 leading-relaxed">
                {scenario.auditor_evaluation}
              </div>
            </div>
          )}
          {scenario.remediation && scenario.vulnerability_found && (
            <div>
              <div className="text-[10px] text-auditor-500 uppercase tracking-wider mb-1">
                <span className="text-neon-yellow">Remediation</span>
              </div>
              <div className="text-xs text-auditor-300 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2 leading-relaxed">
                {scenario.remediation}
              </div>
            </div>
          )}
          {scenario.input && scenario.input.includes('MULTI-TURN') && (
            <div>
              <div className="text-[10px] text-auditor-500 uppercase tracking-wider mb-1">
                <span className="text-neon-purple">Multi-Turn Conversation</span>
              </div>
              <div className="text-xs text-auditor-300 bg-purple-500/5 border border-purple-500/20 rounded-lg p-2 font-mono leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                {scenario.input.split('--- MULTI-TURN FOLLOW-UPS ---')[1] || ''}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
