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

  const isUser = index % 2 === 0;

  return (
    <div className={`flex gap-3 ${isUser ? '' : 'flex-row-reverse'}`}>
      <div className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center ${
        isUser ? 'text-neon-red/40' : 'text-neon-blue/40'
      }`}>
        {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
      </div>
      <div className="max-w-[80%]">
        {turn.input && (
          <div className="mb-1">
            <span className="text-[9px] text-white/15 uppercase tracking-wider">Attack</span>
            <p className="text-[11px] text-white/40 font-mono leading-relaxed mt-0.5">{turn.input.slice(0, 200)}</p>
          </div>
        )}
        {turn.response && (
          <div className={turn.input ? 'mt-2' : ''}>
            <span className="text-[9px] text-white/15 uppercase tracking-wider">Response</span>
            <p className="text-[11px] text-white/30 leading-relaxed mt-0.5">{turn.response.slice(0, 250)}</p>
          </div>
        )}
        {turn.tool_calls?.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {turn.tool_calls.map((t, i) => (
              <span key={i} className="text-[9px] font-mono text-neon-yellow/40">
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
    turns.push({ input: scenario.input, response: scenario.target_response, tool_calls: scenario.tool_calls || [] });
  }

  if (turns.length === 0) return null;

  const scoreColor = score != null ? (score < 40 ? 'text-neon-red/60' : score < 70 ? 'text-neon-yellow/60' : 'text-neon-green/60') : '';

  return (
    <div className="py-3 animate-fade-in">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 text-left cursor-pointer group"
      >
        <div className={`mt-0.5 ${isVuln ? 'text-neon-red/40' : 'text-neon-green/40'}`}>
          {isVuln ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-white/50 truncate group-hover:text-white/70 transition-colors">{scenario.name}</span>
            {turns.length > 1 && (
              <span className="text-[9px] text-neon-purple/40">{turns.length} turns</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[9px] font-medium ${
              scenario.severity === 'critical' ? 'text-neon-red/50'
              : scenario.severity === 'high' ? 'text-neon-orange/50'
              : scenario.severity === 'medium' ? 'text-neon-yellow/50'
              : 'text-neon-blue/50'
            }`}>
              {scenario.severity?.toUpperCase()}
            </span>
            <span className="text-[9px] text-white/15">{CATEGORY_LABELS[scenario.category] || scenario.category}</span>
            {score != null && (
              <span className={`text-[9px] font-mono font-semibold ${scoreColor}`}>{score}/100</span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="ml-7 mt-3 space-y-3 animate-fade-in">
          {turns.map((turn, i) => (
            <TurnBubble key={i} turn={turn} index={i} />
          ))}

          {scenario.auditor_evaluation && (
            <div className="pt-2 border-t border-white/[0.04]">
              <span className="text-[9px] text-white/15 uppercase tracking-wider mb-1 block">Judge</span>
              <div className="text-[11px] text-white/30 leading-relaxed">{scenario.auditor_evaluation}</div>
            </div>
          )}

          {scenario.remediation && isVuln && (
            <div className="pt-2 border-t border-white/[0.04]">
              <span className="text-[9px] text-white/15 uppercase tracking-wider mb-1 block">Fix</span>
              <div className="text-[11px] text-white/30 leading-relaxed">{scenario.remediation}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
