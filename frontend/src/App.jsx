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
      <main className="flex-1 overflow-y-auto flex justify-center">
        <div className="w-full max-w-5xl px-8 py-6 md:px-12 md:py-8">
          {page === 'audit' && <AuditPage />}
          {page === 'chat' && <AgentChatPage />}
          {page === 'reports' && <ReportPage active />}
          {page === 'patterns' && <PatternsPage />}
        </div>
      </main>
    </div>
  );
}
