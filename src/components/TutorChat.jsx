import { useCallback, useState } from 'react';
import { MessageCircle, X, Send, RotateCcw, Crosshair } from 'lucide-react';
import { useTutor } from '../context/TutorContext';
import { postTutorChat } from '../lib/tutorApi';
import { snapshotDiscussionScene } from '../lib/tutorScene';

function newSessionId() {
  return crypto.randomUUID();
}

export default function TutorChat() {
  const { userId, presence, open, setOpen } = useTutor();
  const [sessionId, setSessionId] = useState(() => newSessionId());
  const [hasAnchor, setHasAnchor] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const contextLabel =
    [
      presence.section,
      presence.level_title || presence.level_id,
      presence.phase,
      presence.item_index != null
        ? `${Number(presence.item_index) + 1}/${presence.item_total || '?'}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'PETS-3 助教';

  const send = useCallback(
    async (text, { forceSet = false } = {}) => {
      const message = (text ?? input).trim();
      if (!message || sending) return;
      setError(null);
      setSending(true);
      const tempId = `local-${Date.now()}`;
      setMessages((m) => [...m, { id: tempId, role: 'user', content: message, status: 'pending' }]);
      setInput('');

      const needSet = forceSet || !hasAnchor;
      const discussion = needSet
        ? { bind: 'set', scene: snapshotDiscussionScene(presence) }
        : { bind: 'keep' };

      try {
        const data = await postTutorChat({
          userId,
          sessionId,
          message,
          discussion,
          presence,
        });
        setHasAnchor(true);
        if (data.session_id) setSessionId(data.session_id);
        setMessages((m) =>
          m
            .map((x) => (x.id === tempId ? { ...x, status: 'sent' } : x))
            .concat([
              {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: data.reply,
                status: 'sent',
              },
            ]),
        );
      } catch (e) {
        setMessages((m) => m.map((x) => (x.id === tempId ? { ...x, status: 'failed' } : x)));
        if (e.status === 400 && String(e.message).toLowerCase().includes('session')) {
          setError('会话已失效，请点「讲当前」重新绑定');
          setHasAnchor(false);
        } else {
          setError(e.message || '发送失败');
        }
      } finally {
        setSending(false);
      }
    },
    [input, sending, hasAnchor, presence, userId, sessionId],
  );

  const newTopic = () => {
    setSessionId(newSessionId());
    setHasAnchor(false);
    setMessages([]);
    setError(null);
  };

  const teachCurrent = () => {
    setHasAnchor(false);
    setError(null);
    void send('请根据我当前屏幕上的内容讲解', { forceSet: true });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="问老师"
        className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg px-4 py-3 flex items-center gap-2"
        style={{ background: 'var(--skill-vocab, #58cc02)', color: '#fff', fontWeight: 700 }}
      >
        <MessageCircle width={20} height={20} />
        问老师
      </button>
    );
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col"
      style={{
        maxHeight: '70vh',
        background: 'var(--color-surface, #fff)',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        boxShadow: '0 -8px 32px rgba(0,0,0,.12)',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <div style={{ fontWeight: 800 }}>AI 老师</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{contextLabel}</div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={teachCurrent} title="讲当前" aria-label="讲当前">
            <Crosshair width={18} height={18} />
          </button>
          <button type="button" onClick={newTopic} title="新话题" aria-label="新话题">
            <RotateCcw width={18} height={18} />
          </button>
          <button type="button" onClick={() => setOpen(false)} aria-label="关闭">
            <X width={18} height={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.length === 0 && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            随时问我单词、句子或语法。答题中我只会给提示，不会直接说答案。
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              textAlign: m.role === 'user' ? 'right' : 'left',
              opacity: m.status === 'failed' ? 0.6 : 1,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                maxWidth: '85%',
                padding: '8px 12px',
                borderRadius: 12,
                background:
                  m.role === 'user'
                    ? 'var(--skill-vocab, #58cc02)'
                    : 'var(--color-bg-secondary, #f3f4f6)',
                color: m.role === 'user' ? '#fff' : 'var(--color-text)',
                fontSize: 14,
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.content}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="px-4 py-2 text-sm" style={{ color: 'var(--color-danger, #e11)' }}>
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError(null)}>
            关闭
          </button>
        </div>
      )}

      <div className="flex gap-2 px-3 pb-2 flex-wrap">
        {['怎么记？', '给个提示', '语法结构？'].map((q) => (
          <button
            key={q}
            type="button"
            disabled={sending}
            onClick={() => send(q)}
            style={{
              fontSize: 12,
              padding: '4px 8px',
              borderRadius: 999,
              border: '1px solid var(--color-border)',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2 p-3 border-t"
        style={{ borderColor: 'var(--color-border)' }}
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入你的问题…"
          disabled={sending}
          className="flex-1 rounded-xl px-3 py-2"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
        />
        <button type="submit" disabled={sending || !input.trim()} aria-label="发送">
          <Send width={20} height={20} />
        </button>
      </form>
    </div>
  );
}
