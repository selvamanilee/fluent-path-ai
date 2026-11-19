import { route } from '@/lib/http';
import { q } from '@/lib/db';
import { toRevisionItem } from '@/lib/plan';

export const GET = route({}, async ({ userId }) => {
  const due = await q<any>(
    `SELECT rs.id, rs.item_type, rs.item_id, rs.stage, rs.due_at, v.word, v.meaning_ta, p.text AS phrase, p.meaning AS phrase_meaning, m.original, m.corrected, m.explanation
       FROM revision_schedules rs
       LEFT JOIN vocabulary v ON rs.item_type='vocabulary' AND v.id=rs.item_id
       LEFT JOIN phrases p ON rs.item_type='phrase' AND p.id=rs.item_id
       LEFT JOIN mistake_records m ON rs.item_type='mistake' AND m.id=rs.item_id
      WHERE rs.user_id=$1 AND rs.stage < 5 AND rs.due_at <= now() ORDER BY (rs.item_type='mistake') DESC, rs.due_at LIMIT 20`, [userId]);
  const distractors = (await q<{ word: string }>('SELECT word FROM vocabulary ORDER BY random() LIMIT 10')).map(r => r.word);
  const upcoming = await q<any>(`SELECT to_char(date_trunc('day', due_at),'YYYY-MM-DD') AS date, count(*)::int AS n FROM revision_schedules WHERE user_id=$1 AND stage<5 AND due_at > now() GROUP BY 1 ORDER BY 1 LIMIT 14`, [userId]);
  const stages = await q<any>(`SELECT stage, count(*)::int AS n FROM revision_schedules WHERE user_id=$1 GROUP BY stage ORDER BY stage`, [userId]);
  // Answers are kept server-side; the client only gets prompt/options.
  return { items: due.map(d => { const it = toRevisionItem(d, distractors); return it && { id: d.id, type: it.type, prompt: it.prompt, options: it.options, hint: it.type === 'mistake' ? it.hint : it.hint ?? null, stage: d.stage }; }).filter(Boolean), upcoming, stages };
});
