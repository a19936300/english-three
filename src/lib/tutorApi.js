const base = () => import.meta.env.VITE_TUTOR_API_URL || '';

/**
 * @param {{
 *  userId: string,
 *  sessionId?: string|null,
 *  message: string,
 *  discussion: { bind: 'set'|'keep', scene?: object },
 *  presence?: object|null
 * }} p
 */
export async function postTutorChat(p) {
  const url = `${base()}/tutor/chat`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: p.userId,
      session_id: p.sessionId || null,
      message: p.message,
      discussion: p.discussion,
      presence: p.presence || null,
    }),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      /* ignore */
    }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
