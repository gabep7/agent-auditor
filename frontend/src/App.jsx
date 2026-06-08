import { useState } from 'react';
import Sidebar from './components/Sidebar';
import AuditPage from './pages/AuditPage';
import ReportPage from './pages/ReportPage';
import AgentChatPage from './pages/AgentChatPage';
import PatternsPage from './pages/PatternsPage';

export default function App() {
  const [page, setPage] = useState('audit');

  return (
    <div className="flex h-screen flex-col overflow-hidden grid-bg md:flex-row">
      <Sidebar current={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto p-4 md:p-5">
        <section className={page === 'audit' ? 'block h-full' : 'hidden'}>
          <AuditPage />
        </section>
        <section className={page === 'chat' ? 'block h-full' : 'hidden'}>
          <AgentChatPage />
        </section>
        <section className={page === 'reports' ? 'block h-full' : 'hidden'}>
          <ReportPage active={page === 'reports'} />
        </section>
        <section className={page === 'patterns' ? 'block h-full' : 'hidden'}>
          <PatternsPage />
        </section>
      </main>
    </div>
  );
}
