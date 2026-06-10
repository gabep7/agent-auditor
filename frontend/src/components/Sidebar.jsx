import { Shield, FileText, MessageSquare, BookOpen, ScanEye } from 'lucide-react';

const navItems = [
  { id: 'audit', label: 'Audit', icon: Shield },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'patterns', label: 'Patterns', icon: BookOpen },
];

export default function Sidebar({ current, onNavigate }) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-white/[0.06] md:h-screen md:w-60 md:border-b-0 md:border-r">
      {/* Brand */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <ScanEye className="w-5 h-5 text-white/60" />
          <span className="text-base font-bold text-white tracking-tight">Agent Auditor</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex gap-1 overflow-x-auto px-3 md:flex-1 md:flex-col md:gap-1 md:overflow-visible">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-100 md:w-full text-sm ${
                active
                  ? 'bg-white/[0.08] text-white font-medium'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
