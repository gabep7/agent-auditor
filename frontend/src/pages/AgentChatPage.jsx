import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { agentChat } from '../lib/api';

function InlineText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-white/80">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

function MessageText({ text, isError }) {
  const lines = text.split('\n');

  return (
    <div className={`space-y-2 text-[13px] leading-relaxed ${
      isError ? 'text-neon-red' : 'text-white/55'
    }`}>
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={i} className="h-1" />;
        }

        const heading = trimmed.match(/^\*\*([^*]+):\*\*$/);
        if (heading) {
          return (
            <div key={i} className="pt-1 text-[11px] font-semibold uppercase tracking-wider text-white/35">
              {heading[1]}
            </div>
          );
        }

        const leadIn = trimmed.match(/^\*\*([^*]+):\*\*\s*(.+)$/);
        if (leadIn) {
          return (
            <p key={i}>
              <span className="font-semibold text-white/75">{leadIn[1]}: </span>
              <InlineText text={leadIn[2]} />
            </p>
          );
        }

        const bullet = trimmed.match(/^[-*]\s+(.+)$/);
        if (bullet) {
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-white/25" />
              <span><InlineText text={bullet[1]} /></span>
            </div>
          );
        }

        const numbered = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (numbered) {
          return (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 text-[11px] font-mono text-white/25">{numbered[1]}.</span>
              <span><InlineText text={numbered[2]} /></span>
            </div>
          );
        }

        return (
          <p key={i}>
            <InlineText text={trimmed} />
          </p>
        );
      })}
    </div>
  );
}

export default function AgentChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'I am Agent Auditor, a red-team testing agent for AI systems. Tell me what to audit and I will look for unsafe behavior.\n\nTry: "Register the customer support agent at http://localhost:8000/api/victim/customer_support and audit it."',
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
    <div className="h-full flex flex-col max-h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-white">Agent Chat</h1>
          <span className="text-xs text-white/20">ADK Agent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-blink" />
          <span className="text-[10px] text-white/20">Active</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            style={{ animationDelay: `${Math.min(i * 40, 160)}ms` }}
          >
            <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
              msg.role === 'user' ? 'bg-neon-blue/10' : 'bg-white/[0.04]'
            }`}>
              {msg.role === 'user'
                ? <User className="w-3 h-3 text-neon-blue" />
                : <Bot className="w-3 h-3 text-white/30" />
              }
            </div>

            <div className={`max-w-[75%] ${msg.role === 'user' ? 'text-right' : ''}`}>
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/70">
                  {msg.text}
                </div>
              ) : (
                <MessageText text={msg.text} isError={msg.isError} />
              )}
              {msg.tool_calls?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 justify-end">
                  {msg.tool_calls.map((tool, j) => (
                    <span key={j} className="text-[10px] font-mono text-neon-green/60">
                      {tool}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 animate-slide-up">
            <div className="w-6 h-6 rounded-md bg-white/[0.04] flex items-center justify-center">
              <Bot className="w-3 h-3 text-white/30" />
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 text-white/20 animate-spin" />
              <span className="text-sm text-white/20">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="mt-4 pt-4 border-t border-white/[0.06] flex gap-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Tell the agent what to audit..."
          disabled={loading}
          className="flex-1 bg-white/[0.03] rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/15 py-3 px-4"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-primary flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </form>
    </div>
  );
}
