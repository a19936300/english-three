import { useState } from 'react';

const STORAGE_KEY = 'pets3_user_id';

export function ensureUserId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    if (!globalThis.__pets3EphemeralUserId) {
      globalThis.__pets3EphemeralUserId = crypto.randomUUID();
    }
    return globalThis.__pets3EphemeralUserId;
  }
}

export function useUserId() {
  const [userId] = useState(() => ensureUserId());
  return userId;
}
