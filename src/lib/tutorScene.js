/**
 * @param {{ surface?: string, phase?: string, answerState?: string }} s
 */
export function canRevealAnswer(s = {}) {
  const { surface, phase, answerState } = s;
  if (surface === 'result') return true;
  if (phase === 'learn' || phase === 'lesson' || phase === 'passage') return true;
  if (phase === 'quiz' && answerState && answerState !== 'unanswered') return true;
  return false;
}

/**
 * @param {Record<string, unknown>} partial
 */
export function buildPresenceScene(partial = {}) {
  const scene = {
    surface: partial.surface ?? 'home',
    section: partial.section ?? null,
    level_id: partial.levelId ?? partial.level_id ?? null,
    level_title: partial.levelTitle ?? partial.level_title ?? null,
    phase: partial.phase ?? null,
    item_index: partial.itemIndex ?? partial.item_index ?? null,
    item_total: partial.itemTotal ?? partial.item_total ?? null,
    content: partial.content ?? null,
    answer_state: partial.answerState ?? partial.answer_state ?? 'unanswered',
    updated_at: Date.now(),
  };
  scene.can_reveal_answer = canRevealAnswer({
    surface: scene.surface,
    phase: scene.phase,
    answerState: scene.answer_state,
  });
  return scene;
}

/** Snapshot for discussion.bind=set */
export function snapshotDiscussionScene(presenceScene) {
  return JSON.parse(JSON.stringify(presenceScene));
}
