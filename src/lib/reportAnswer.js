import { supabase } from './supabase.js';
import { ensureUserId } from '../hooks/useUserId.js';

/**
 * @param {{
 *  questionId: string,
 *  levelId: string|number,
 *  section: string,
 *  isCorrect: boolean,
 *  timeSpent?: number|null
 * }} p
 */
export async function reportAnswer(p) {
  const user_id = ensureUserId();
  const row = {
    user_id,
    question_id: String(p.questionId),
    level_id: String(p.levelId),
    section: p.section,
    is_correct: !!p.isCorrect,
    time_spent: p.timeSpent ?? null,
  };
  try {
    const { error } = await supabase.from('user_answers').insert(row);
    if (error) console.warn('[reportAnswer]', error.message);
  } catch (e) {
    console.warn('[reportAnswer]', e);
  }
}
