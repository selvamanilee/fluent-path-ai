import { z } from 'zod';
import { route, body, cleanText } from '@/lib/http';
import { q } from '@/lib/db';
import { syllableGuide } from '@/lib/pronunciation';

// Records a practice attempt. No audio is uploaded or stored: without a configured speech-assessment
// service we return guidance only and NEVER a pronunciation score.
const Z = z.object({ target: cleanText(200).pipe(z.string().min(1)), transcript: cleanText(500).optional() });
export const POST = route({}, async ({ req, userId }) => {
  const b = await body(req, Z);
  const guide = syllableGuide(b.target);
  const heard = b.transcript?.toLowerCase().replace(/[^a-z' ]/g, '').trim();
  const recognised = heard ? heard === b.target.toLowerCase().replace(/[^a-z' ]/g, '').trim() : null;
  await q('INSERT INTO pronunciation_attempts(user_id, target, transcript, audio_assessed, details) VALUES ($1,$2,$3,false,$4)', [userId, b.target, b.transcript ?? null, JSON.stringify({ recognised })]);
  return {
    audioAssessed: false, score: null, guide,
    recognised,
    message: recognised === null ? 'Listen, then repeat three times. Compare with the syllable guide.'
      : recognised ? 'Your browser’s speech recogniser understood the word. (This is not a pronunciation score.)'
      : 'Your browser’s speech recogniser heard something different. Listen again and repeat slowly, syllable by syllable.',
  };
});
