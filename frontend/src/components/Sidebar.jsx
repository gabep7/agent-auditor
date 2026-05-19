import { Shield, FileText, MessageSquare, BookOpen, Cpu } from 'lucide-react';

const navItems = [
  { id: 'audit', label: 'Run Audit', icon: Shield, desc: 'Adversarial testing' },
  { id: 'chat', label: 'Agent Chat', icon: MessageSquare, desc: 'Interactive ADK agent' },
  { id: 'reports', label: 'Reports', icon: FileText, desc: 'Past audit history' },
  { id: 'patterns', label: 'Patterns', icon: BookOpen, desc: 'Attack pattern library' },
];

export default function Sidebar({ current, onNavigate }) {
  return (
    <aside className="w-60 glass-strong flex flex-col border-r border-auditor-600/50">
      {/* Brand */}
      <div className="p-5 border-b border-auditor-600/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-neon-green/10 border border-neon-green/20 animate-pulse-glow">
            <Shield className="w-6 h-6 text-neon-green" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-neon-green text-glow-green tracking-tight">
              Agent Auditor
            </h1>
            <p className="text-[10px] text-auditor-500 font-medium">Adversarial Red Team</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                active
                  ? 'bg-neon-green/10 border border-neon-green/20 text-neon-green'
                  : 'text-auditor-400 hover:bg-auditor-700/50 hover:text-auditor-200 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 transition-colors ${active ? 'text-neon-green' : 'text-auditor-500 group-hover:text-auditor-300'}`} />
              <div>
                <div className="text-xs font-semibold">{item.label}</div>
                <div className={`text-[9px] ${active ? 'text-neon-green/60' : 'text-auditor-600'}`}>{item.desc}</div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-auditor-600/50">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-3 h-3 text-auditor-500" />
          <span className="text-[10px] text-auditor-500 font-medium">Powered by</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-neon-blue/10 border border-neon-blue/20 text-neon-blue">
            Gemini 2.5
          </span>
          <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-neon-purple/10 border border-neon-purple/20 text-neon-purple">
            Google ADK
          </span>
          <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-neon-yellow/10 border border-neon-yellow/20 text-neon-yellow">
            Arize Phoenix
          </span>
        </div>
      </div>
    </aside>
  );
}
