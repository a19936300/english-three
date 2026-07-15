import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useUserId } from '../hooks/useUserId';
import { buildPresenceScene } from '../lib/tutorScene';

const TutorContext = createContext(null);

export function TutorProvider({ children }) {
  const userId = useUserId();
  const [presence, setPresenceState] = useState(() => buildPresenceScene({ surface: 'home' }));
  const [open, setOpen] = useState(false);

  const setPresence = useCallback((partialOrScene) => {
    setPresenceState((prev) => {
      if (partialOrScene && partialOrScene.updated_at && partialOrScene.surface) {
        return partialOrScene;
      }
      return buildPresenceScene({ ...prev, ...partialOrScene });
    });
  }, []);

  const value = useMemo(
    () => ({ userId, presence, setPresence, open, setOpen }),
    [userId, presence, setPresence, open],
  );

  return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>;
}

export function useTutor() {
  const ctx = useContext(TutorContext);
  if (!ctx) throw new Error('useTutor must be used within TutorProvider');
  return ctx;
}
