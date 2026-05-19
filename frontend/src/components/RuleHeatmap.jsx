import { Shield, ShieldAlert } from 'lucide-react';

function getHeatLevel(rate) {
  if (rate === 0) return 'low';
  if (rate <= 0.25) return 'medium';
  if (rate <= 0.5) return 'high';
  return 'critical';
}

export default function RuleHeatmap({ data, loading }) {
  if (loading) {
    return (
      <div className="glass rounded-xl p-4 animate-pulse">
        <div className="h-4 w-32 bg-auditor-700 rounded mb-4" />
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="h-10 bg-auditor-700/50 rounded mb-2" />
        ))}
      </div>
    );
  }

  if (!data?.rule_summary) {
    return (
      <div className="glass rounded-xl p-4 text-center">
        <Shield className="w-6 h-6 text-auditor-600 mx-auto mb-2" />
        <p className="text-xs text-auditor-500">Run an audit against Enterprise Support to see rule-level analysis</p>
      </div>
    );
  }

  const rules = Object.entries(data.rule_summary).sort(([, a], [, b]) => b.rate - a.rate);
  const total = data.total_violations || 0;

  return (
    <div className="glass rounded-xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-neon-red" />
          <span className="text-xs font-bold text-auditor-200 uppercase tracking-wider">Security Rules Broken</span>
        </div>
        <span className="text-[10px] font-mono font-bold text-auditor-400">
          {total} violations across {data.total_tests} tests
        </span>
      </div>

      <div className="space-y-1.5">
        {rules.map(([ruleId, rule]) => {
          const level = getHeatLevel(rule.rate);
          const barPct = Math.min(100, rule.rate * 100);
          return (
            <div key={ruleId} className="group">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-mono font-bold text-auditor-500 w-8">{ruleId}</span>
                <span className="text-[11px] text-auditor-300 flex-1 truncate">{rule.label}</span>
                <span className="text-[9px] font-mono text-auditor-500">
                  {rule.violations}/{rule.total_tests}
                </span>
                <span className={`text-[9px] font-mono font-bold ${
                  level === 'critical' ? 'text-neon-red' :
                  level === 'high' ? 'text-orange-400' :
                  level === 'medium' ? 'text-yellow-400' :
                  'text-emerald-400'
                }`}>
                  {Math.round(rule.rate * 100)}%
                </span>
              </div>
              {/* Heat bar */}
              <div className="w-full h-2 bg-auditor-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    level === 'critical' ? 'bg-red-500' :
                    level === 'high' ? 'bg-orange-500' :
                    level === 'medium' ? 'bg-yellow-500' :
                    'bg-emerald-500'
                  }`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              {/* Tooltip on hover */}
              <div className="hidden group-hover:block absolute z-10 bg-auditor-800 border border-auditor-600 rounded-lg p-2 mt-1 text-[10px] text-auditor-300 max-w-xs">
                {rule.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
