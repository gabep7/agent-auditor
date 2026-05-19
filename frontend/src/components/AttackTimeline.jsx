import { useState } from 'react';
import { Bot, User, ShieldAlert, ShieldCheck } from 'lucide-react';

const CATEGORY_LABELS = {
  parameter_attack: 'Param Attack',
  prompt_injection: 'Injection',
  contradictory: 'Contradict',
  edge_case: 'Edge Case',
  multi_turn: 'Multi-Turn',
  tool_misuse: 'Tool Misuse',
};

function TurnBubble({ turn, index }) {
  if (!turn || (!turn.input && !turn.response)) return null;

  const isUser = index % 2 === 0; // attacker = user, victim = response
  const toolCalls = turn.tool_calls || [];

  return (
    <div className={`flex gap-3 ${isUser ? '' : 'flex-row-reverse'} animate-slide-up`}
      style={{ animationDelay: `${Math.min(index * 100, 500)}ms` }}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
        isUser
          ? 'bg-neon-red/10 border border-neon-red/20'
          : 'bg-neon-blue/10 border border-neon-blue/20'
      }`}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-neon-red" />
          : <Bot className="w-3.5 h-3.5 text-neon-blue" />
        }
      </div>
      {/* Bubble */}
      <div className={`max-w-[75%] rounded-xl p-3 ${
        isUser
          ? 'glass border-neon-red/20 bg-neon-red/5'
          : 'glass border-neon-green/20 bg-neon-green/5'
      }`}>
        {turn.input && (
          <div className="mb-1">
            <span className="text-[9px] text-auditor-500 uppercase tracking-wider">Attack</span>
            <p className="text-xs text-auditor-200 font-mono leading-relaxed mt-0.5">{turn.input.slice(0, 200)}</p>
          </div>
        )}
        {turn.response && (
          <div className={turn.input ? 'mt-2 pt-2 border-t border-auditor-700/30' : ''}>
            <span className="text-[9px] text-auditor-500 uppercase tracking-wider">Response</span>
            <p className="text-xs text-auditor-300 leading-relaxed mt-0.5">{turn.response.slice(0, 250)}</p>
          </div>
        )}
        {toolCalls.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {toolCalls.map((t, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-neon-yellow/10 border border-neon-yellow/20 text-neon-yellow">
                {typeof t === 'string' ? t : t.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AttackTimeline({ scenario }) {
  const [expanded, setExpanded] = useState(false);
  if (!scenario) return null;

  const isVuln = scenario.vulnerability_found;
  const score = scenario.score != null ? Math.round(scenario.score) : null;

  // Parse multi-turn data from scenario input
  const turns = [];
  if (scenario.input && scenario.input.includes('--- MULTI-TURN FOLLOW-UPS ---')) {
    const parts = scenario.input.split('--- MULTI-TURN FOLLOW-UPS ---');
    const initialInput = parts[0].trim();
    if (initialInput) {
      turns.push({ input: initialInput, response: scenario.target_response, tool_calls: scenario.tool_calls || [] });
    }
    const followUps = parts[1] || '';
    const followUpBlocks = followUps.split('[Turn');
    followUpBlocks.forEach(block => {
      if (!block.trim()) return;
      const inputMatch = block.match(/Input: (.+)/);
      const responseMatch = block.match(/Response: (.+)/);
      if (inputMatch || responseMatch) {
        turns.push({
          input: inputMatch ? inputMatch[1].trim() : '',
          response: responseMatch ? responseMatch[1].trim() : '',
          tool_calls: [],
        });
      }
    });
  } else {
    // Single turn
    turns.push({ input: scenario.input, response: scenario.target_response, tool_calls: scenario.tool_calls || [] });
  }

  if (turns.length === 0) return null;

  return (
    <div className={`rounded-xl border backdrop-blur-sm transition-all duration-300 animate-fade-in ${
      isVuln
        ? 'bg-red-500/5 border-red-500/20'
        : 'bg-emerald-500/5 border-emerald-500/20'
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-start gap-3 text-left cursor-pointer"
      >
        <div className={`p-1.5 rounded-lg ${isVuln ? 'bg-red-500/15' : 'bg-emerald-500/15'}`}>
          {isVuln
            ? <ShieldAlert className="w-4 h-4 text-red-400" />
            : <ShieldCheck className="w-4 h-4 text-emerald-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-auditor-200 truncate">{scenario.name}</span>
            {turns.length > 1 && (
              <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400">
                {turns.length} turns
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${
              scenario.severity === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : scenario.severity === 'high' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
              : scenario.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}>
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
        </div>
      </button>

      {/* Expanded timeline */}
      {expanded && (
        <div className="px-3 pb-4">
          <div className="space-y-3 mt-1">
            {turns.map((turn, i) => (
              <TurnBubble key={i} turn={turn} index={i} />
            ))}
          </div>

          {/* Judge evaluation */}
          {scenario.auditor_evaluation && (
            <div className="mt-3 pt-3 border-t border-auditor-700/50">
              <span className="text-[9px] text-auditor-500 uppercase tracking-wider mb-1 block">
                LLM Judge
              </span>
              <div className="text-xs text-auditor-300 bg-neon-blue/5 border border-neon-blue/10 rounded-lg p-2 leading-relaxed">
                {scenario.auditor_evaluation}
              </div>
            </div>
          )}

          {/* Remediation */}
          {scenario.remediation && isVuln && (
            <div className="mt-2 pt-2 border-t border-auditor-700/50">
              <span className="text-[9px] text-auditor-500 uppercase tracking-wider mb-1 block">
                Remediation
              </span>
              <div className="text-xs text-auditor-300 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2 leading-relaxed">
                {scenario.remediation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
