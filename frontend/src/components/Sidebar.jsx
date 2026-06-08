import { Shield, FileText, MessageSquare, BookOpen, Cpu } from 'lucide-react';

const navItems = [
  { id: 'audit', label: 'Run Audit', icon: Shield, desc: 'Adversarial testing' },
  { id: 'chat', label: 'Agent Chat', icon: MessageSquare, desc: 'Interactive ADK agent' },
  { id: 'reports', label: 'Reports', icon: FileText, desc: 'Past audit history' },
  { id: 'patterns', label: 'Patterns', icon: BookOpen, desc: 'Attack pattern library' },
];

export default function Sidebar({ current, onNavigate }) {
  return (
    <aside className="w-52 glass-strong flex flex-col border-r border-auditor-600/50">
      {/* Brand */}
      <div className="px-4 py-3 border-b border-auditor-600/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-neon-green/10 border border-neon-green/20 animate-pulse-glow">
            <Shield className="w-4 h-4 text-neon-green" />
          </div>
          <div>
            <h1 className="text-xs font-extrabold text-neon-green text-glow-green tracking-tight">
              Agent Auditor
            </h1>
            <p className="text-[9px] text-auditor-500 font-medium">Adversarial Red Team</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150 group ${
                active
                  ? 'bg-neon-green/10 border border-neon-green/20 text-neon-green'
                  : 'text-auditor-400 hover:bg-auditor-700/50 hover:text-auditor-200 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 transition-colors ${active ? 'text-neon-green' : 'text-auditor-500 group-hover:text-auditor-300'}`} />
              <div>
                <div className="text-[11px] font-semibold">{item.label}</div>
                <div className={`text-[8px] ${active ? 'text-neon-green/60' : 'text-auditor-600'}`}>{item.desc}</div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-auditor-600/50">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Cpu className="w-2.5 h-2.5 text-auditor-500" />
          <span className="text-[8px] text-auditor-500 font-medium uppercase tracking-wider">Built with</span>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-neon-blue/10 border border-neon-blue/20 text-neon-blue">
            Gemini 2.5
          </span>
          <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-neon-purple/10 border border-neon-purple/20 text-neon-purple">
            Agent Builder
          </span>
          <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-neon-yellow/10 border border-neon-yellow/20 text-neon-yellow">
            Arize Phoenix
          </span>
          <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-neon-orange/10 border border-neon-orange/20 text-neon-orange">
            OWASP Top 10
          </span>
        </div>
      </div>
    </aside>
  );
}
