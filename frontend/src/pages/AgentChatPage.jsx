import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User, Loader2 } from 'lucide-react';
import { agentChat } from '../lib/api';

export default function AgentChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'I\'m Agent Auditor — an adversarial red-team system for AI agents. Tell me which agent to audit and I\'ll find its vulnerabilities.\n\nTry: "Register the customer support agent at http://localhost:8000/api/victim/customer_support and audit it."',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await agentChat(text, sessionId);
      setSessionId(res.session_id);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: res.response || '(No response)',
        tool_calls: res.tool_calls_made || [],
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `Error: ${err.message}`,
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col max-h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 animate-fade-in">
        <div className="p-2 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
          <MessageSquare className="w-5 h-5 text-neon-purple" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-auditor-100">Agent Chat</h1>
          <p className="text-xs text-auditor-500">Interactive ADK Agent — powered by Gemini 2.5 Flash</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-neon-green animate-blink" />
          <span className="text-[10px] text-auditor-400">ADK Agent Active</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            style={{ animationDelay: `${Math.min(i * 50, 200)}ms` }}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
              msg.role === 'user'
                ? 'bg-neon-blue/10 border border-neon-blue/20'
                : 'bg-neon-green/10 border border-neon-green/20'
            }`}>
              {msg.role === 'user'
                ? <User className="w-4 h-4 text-neon-blue" />
                : <Bot className="w-4 h-4 text-neon-green" />
              }
            </div>

            {/* Message bubble */}
            <div className={`max-w-[75%] rounded-xl p-3 ${
              msg.role === 'user'
                ? 'glass border-neon-blue/20'
                : msg.isError
                  ? 'glass border-neon-red/20'
                  : 'glass'
            }`}>
              <pre className="text-sm text-auditor-200 whitespace-pre-wrap font-sans leading-relaxed">
                {msg.text}
              </pre>
              {msg.tool_calls?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-auditor-700/50">
                  <div className="text-[10px] text-auditor-500 uppercase tracking-wider mb-1">Tools Used</div>
                  <div className="flex flex-wrap gap-1">
                    {msg.tool_calls.map((tool, j) => (
                      <span key={j} className="px-2 py-0.5 rounded text-[10px] font-mono bg-neon-green/10 border border-neon-green/20 text-neon-green">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 animate-slide-up">
            <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-neon-green" />
            </div>
            <div className="glass rounded-xl p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-neon-green animate-spin" />
              <span className="text-sm text-auditor-400">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="mt-4 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Tell the agent what to audit..."
          disabled={loading}
          className="flex-1 glass rounded-xl px-4 py-3 text-sm text-auditor-200 placeholder-auditor-500 focus:outline-none focus:border-neon-green/40 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </form>
    </div>
  );
}
