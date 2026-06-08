import { Shield, FileText, MessageSquare, BookOpen, Cpu, CheckCircle2, Clock3 } from 'lucide-react';

const navItems = [
  { id: 'audit', label: 'Run Audit', icon: Shield, desc: 'Adversarial testing' },
  { id: 'chat', label: 'Agent Chat', icon: MessageSquare, desc: 'Interactive ADK agent' },
  { id: 'reports', label: 'Reports', icon: FileText, desc: 'Past audit history' },
  { id: 'patterns', label: 'Patterns', icon: BookOpen, desc: 'Attack pattern library' },
];

export default function Sidebar({ current, onNavigate }) {
  return (
    <aside className="glass-strong flex w-full shrink-0 flex-col border-b border-auditor-600/50 md:h-screen md:w-52 md:border-b-0 md:border-r">
      {/* Brand */}
      <div className="px-4 py-3 border-b border-auditor-600/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-neon-green/10 border border-neon-green/20">
            <Shield className="w-4 h-4 text-neon-green" />
          </div>
          <div>
            <h1 className="text-xs font-extrabold text-auditor-100 tracking-tight">
              Agent Auditor
            </h1>
            <p className="text-[9px] text-auditor-500 font-medium">Adversarial Red Team</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex gap-1 overflow-x-auto p-2 md:flex-none md:flex-col md:space-y-0.5 md:overflow-visible">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex min-w-36 items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all duration-150 group md:w-full md:min-w-0 ${
                active
                  ? 'bg-auditor-700/50 border-auditor-500/40 text-auditor-100'
                  : 'text-auditor-400 hover:bg-auditor-700/40 hover:text-auditor-200 border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 transition-colors ${active ? 'text-neon-green' : 'text-auditor-500 group-hover:text-auditor-300'}`} />
              <div>
                <div className="text-[11px] font-semibold">{item.label}</div>
                <div className={`text-[8px] ${active ? 'text-auditor-400' : 'text-auditor-600'}`}>{item.desc}</div>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="hidden flex-1 px-3 py-4 md:block">
        <div className="rounded-lg border border-auditor-600/40 bg-auditor-900/25 p-3">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-auditor-500">
            <Clock3 className="h-3 w-3" />
            Demo path
          </div>
          <div className="space-y-2">
            {[
              'Launch quick audit',
              'Open vulnerable finding',
              'Show Phoenix trace',
              'Download report',
            ].map((item, index) => (
              <div key={item} className="grid grid-cols-[18px_minmax(0,1fr)] gap-2 text-[11px] text-auditor-400">
                <span className="font-mono text-auditor-600">{index + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-auditor-600/40 bg-auditor-900/25 p-3">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-auditor-500">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            Runtime
          </div>
          <div className="space-y-2 font-mono text-[10px] text-auditor-400">
            <div className="flex justify-between gap-2">
              <span>max_scale</span>
              <span className="text-auditor-300">1</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>audit_rounds</span>
              <span className="text-auditor-300">1</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>store</span>
              <span className="text-auditor-300">sqlite</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>trace</span>
              <span className="text-auditor-300">phoenix</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="hidden px-4 py-3 border-t border-auditor-600/50 md:block">
        <div className="flex items-center gap-2 text-[10px] text-auditor-500">
          <Cpu className="w-3 h-3" />
          <span>Gemini / ADK / Phoenix</span>
        </div>
      </div>
    </aside>
  );
}
