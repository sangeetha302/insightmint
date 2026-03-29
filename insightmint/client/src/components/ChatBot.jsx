import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, User } from 'lucide-react';
import { sendChat } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const SUGGESTIONS_EN = ['Explain the key concepts','Give me a practical example','What are the best practices?','How do I get started?','What career paths use this?'];

export default function ChatBot({ topic, compact = false }) {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    setMessages([{ role: 'assistant', content: `${t.chatTitle}! **${topic}** ${t.chatPlaceholder}. 😊` }]);
  }, [topic, language]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const { data } = await sendChat(msg, topic, newMessages.slice(-6));
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, connection error. Please try again.' }]);
    } finally { setLoading(false); }
  };

  const renderContent = (text) =>
    text.replace(/\*\*(.*?)\*\*/g, `<strong style="color:var(--accent-primary)">$1</strong>`);

  return (
    <div className={compact ? 'flex flex-col h-full' : 'animate-fade-in'}>
      {!compact && (
        <div className="flex items-center gap-2 mb-6">
          <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
          <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{t.chatTitle}</h2>
          <span className="ml-auto flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--accent-primary)', opacity: 0.6 }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-primary)' }} />{t.online}
          </span>
        </div>
      )}

      <div className={`overflow-y-auto space-y-3 pr-1 ${compact ? 'flex-1 p-4' : 'h-80 mb-4'}`}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-mint-400 to-mint-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles size={12} className="text-ink-950" />
              </div>
            )}
            <div className="max-w-[85%] px-4 py-3 rounded-2xl text-sm font-body leading-relaxed"
                 style={msg.role === 'user'
                   ? { background: 'var(--chat-user-bg)', color: 'var(--text-primary)', border: '1px solid var(--chat-user-border)', borderBottomRightRadius: '4px' }
                   : { background: 'var(--chat-ai-bg)', color: 'var(--text-secondary)', border: '1px solid var(--chat-ai-border)', borderBottomLeftRadius: '4px' }}
                 dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }} />
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
                <User size={12} style={{ color: 'var(--accent-primary)' }} />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-mint-400 to-mint-600 flex items-center justify-center flex-shrink-0">
              <Sparkles size={12} className="text-ink-950" />
            </div>
            <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ background: 'var(--chat-ai-bg)', border: '1px solid var(--chat-ai-border)' }}>
              <div className="flex gap-1.5">
                {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && !compact && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTIONS_EN.map(s => (
            <button key={s} onClick={() => send(s)}
              className="text-xs px-3 py-1.5 rounded-full font-body transition-all"
              style={{ background: 'var(--suggestion-bg)', border: '1px solid var(--suggestion-border)', color: 'var(--text-muted)' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className={compact ? 'p-3' : ''} style={compact ? { borderTop: '1px solid var(--border-default)' } : {}}>
        <div className="flex gap-2">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={`${t.chatPlaceholder} ${topic}...`}
            className="input-field text-sm py-2.5" disabled={loading} />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="btn-primary py-2.5 px-4 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}