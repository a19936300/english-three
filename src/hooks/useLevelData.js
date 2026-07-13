import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useLevelData() {
  const [levelsBySection, setLevelsBySection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lv, w, ex, q] = await Promise.all([
          supabase.from('levels').select('*').order('sort_order'),
          supabase.from('words').select('*').order('sort_order'),
          supabase.from('examples').select('*').order('sort_order'),
          supabase.from('questions').select('*').order('sort_order'),
        ]);
        if (lv.error) throw lv.error;
        if (w.error) throw w.error;
        if (ex.error) throw ex.error;
        if (q.error) throw q.error;

        const groupBy = (rows) => {
          const m = new Map();
          rows.forEach(r => {
            const arr = m.get(r.level_id);
            if (arr) arr.push(r);
            else m.set(r.level_id, [r]);
          });
          return m;
        };
        const wordMap = groupBy(w.data);
        const exMap = groupBy(ex.data);
        const qMap = groupBy(q.data);

        const result = { vocabulary: [], grammar: [], reading: [], exam: [] };
        for (const row of lv.data) {
          const level = {
            id: row.level_no,
            title: row.title,
            description: row.description,
            icon: row.icon,
            color: row.color,
            type: row.type || undefined,
            lesson: row.lesson || undefined,
            passage: row.passage || undefined,
            passageCn: row.passage_cn || undefined,
            words: (wordMap.get(row.id) || []).map(r => ({
              en: r.en,
              cn: r.cn,
              phonetic: r.phonetic,
              example: r.example,
              exampleCn: r.example_cn,
            })),
            examples: exMap.get(row.id) || [],
            quiz: qMap.get(row.id) || [],
            questions: qMap.get(row.id) || [],
          };
          result[row.section].push(level);
        }
        if (!cancelled) setLevelsBySection(result);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { levelsBySection, loading, error };
}
