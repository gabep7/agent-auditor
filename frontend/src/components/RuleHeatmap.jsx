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
      <div className="animate-pulse space-y-2">
        <div className="h-3 w-28 bg-white/[0.04] rounded" />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-6 bg-white/[0.02] rounded" />
        ))}
      </div>
    );
  }

  if (!data?.rule_summary) {
    return (
      <div className="py-4">
        <Shield className="w-5 h-5 text-white/10 mx-auto mb-2" />
        <p className="text-[11px] text-white/20 text-center">Run against Enterprise Support for rule analysis</p>
      </div>
    );
  }

  const rules = Object.entries(data.rule_summary).sort(([, a], [, b]) => b.rate - a.rate);
  const total = data.total_violations || 0;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-white/25" />
          <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Rules Broken</span>
        </div>
        <span className="text-[10px] font-mono text-white/20">{total} violations</span>
      </div>

      <div className="space-y-2">
        {rules.map(([ruleId, rule]) => {
          const level = getHeatLevel(rule.rate);
          const barPct = Math.min(100, rule.rate * 100);
          return (
            <div key={ruleId}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-mono text-white/20 w-8">{ruleId}</span>
                <span className="text-[11px] text-white/40 flex-1 truncate">{rule.label}</span>
                <span className={`text-[9px] font-mono font-semibold ${
                  level === 'critical' ? 'text-neon-red/50' :
                  level === 'high' ? 'text-neon-orange/50' :
                  level === 'medium' ? 'text-neon-yellow/50' :
                  'text-neon-green/50'
                }`}>
                  {Math.round(rule.rate * 100)}%
                </span>
              </div>
              <div className="w-full h-1 bg-white/[0.03] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    level === 'critical' ? 'bg-neon-red/40' :
                    level === 'high' ? 'bg-neon-orange/40' :
                    level === 'medium' ? 'bg-neon-yellow/40' :
                    'bg-neon-green/40'
                  }`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
