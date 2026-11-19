// Deterministic evaluation.
// 1) Objective answers (mcq / fill / correct): normalized comparison.
// 2) Open answers: a rule-based checker for the most common beginner errors made by Tamil
//    speakers. Used when the AI agent is unavailable, and always labelled evaluator="rules".

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  explanation_ta?: string;
  category: string;
}

export interface Evaluation {
  score: number; // 0..100
  corrections: Correction[];
  natural_version: string;
  professional_version?: string;
  feedback: string;
  repeat_practice?: string;
  criteria?: Record<string, number>;
  evaluator: 'rules' | 'llm';
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*[.!?]+$/g, '');
}

export function isCorrect(answer: string, accepted: string[]): boolean {
  const a = normalize(answer ?? '');
  return a.length > 0 && accepted.some(x => normalize(x) === a);
}

// ---------- open-text rules ----------
const THIRD_PERSON = new Set(['he', 'she', 'it']);
const PLURAL_SUBJ = new Set(['you', 'we', 'they']);
const COMMON_VERBS = ['work', 'go', 'like', 'live', 'play', 'eat', 'drink', 'want', 'need', 'use', 'write', 'read', 'speak', 'watch', 'teach', 'come', 'make', 'know', 'love', 'study', 'manage', 'lead', 'test', 'build', 'fix', 'review', 'deploy', 'help', 'wake', 'sleep', 'take', 'do', 'have', 'try'];
const MODALS = new Set(['can', 'could', 'should', 'would', 'will', 'must', 'may', 'might']);
// Words starting with a vowel letter but a consonant sound, and vice versa.
const A_EXCEPTIONS = /^(user|users|university|unit|unique|uniform|union|one|once|european|useful|usual|usb|ui|url)\b/i;
const AN_EXCEPTIONS = /^(hour|hours|honest|honour|honor|heir|mba|mca|sql|api|fyi|hr|it\b|mri|sms|xml|ssl)/i;

function thirdPersonForm(v: string): string {
  if (v === 'have') return 'has';
  if (v === 'do') return 'does';
  if (v === 'go') return 'goes';
  if (/(s|sh|ch|x|z)$/.test(v)) return v + 'es';
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies';
  return v + 's';
}

function matchCase(src: string, repl: string) {
  return src[0] === src[0]?.toUpperCase() ? repl[0].toUpperCase() + repl.slice(1) : repl;
}

interface Rule { re: RegExp; fix: (m: RegExpExecArray) => string; category: string; explanation: string; explanation_ta: string }

const RULES: Rule[] = [
  { re: /^myself\s+([a-z]+)/gi, fix: m => `My name is ${m[1][0].toUpperCase()}${m[1].slice(1)}`, category: 'introduction', explanation: '"Myself + name" is not natural English. Say "My name is …" or "I am …".', explanation_ta: '"Myself + பெயர்" என்பது தவறு. "My name is …" அல்லது "I am …" என்று சொல்லவும்.' },
  { re: /\bi\s+(is|are)\b/gi, fix: m => matchCase(m[0], 'I am'), category: 'be-verb', explanation: '"I" always takes "am".', explanation_ta: '"I" உடன் எப்போதும் "am".' },
  { re: /\b(he|she|it)\s+(are|am)\b/gi, fix: m => `${m[1]} is`, category: 'be-verb', explanation: 'He / She / It take "is".', explanation_ta: 'He / She / It உடன் "is".' },
  { re: /\b(you|we|they)\s+(is|am)\b/gi, fix: m => `${m[1]} are`, category: 'be-verb', explanation: 'You / We / They take "are".', explanation_ta: 'You / We / They உடன் "are".' },
  { re: /\b(i|you|we|they)\s+has\b/gi, fix: m => `${m[1] === 'i' ? 'I' : m[1]} have`, category: 'have-has', explanation: 'I / You / We / They take "have".', explanation_ta: 'I / You / We / They உடன் "have".' },
  { re: /(?<!\b(?:do|does|did|can|could|will|would|should|must|may|might|let|make|to)\s)\b(he|she|it)\s+have\b/gi, fix: m => `${m[1]} has`, category: 'have-has', explanation: 'He / She / It take "has".', explanation_ta: 'He / She / It உடன் "has".' },
  { re: new RegExp(`(?<!\\b(?:do|does|did|can|could|will|would|should|must|may|might|let|make|made|help|helps|to)\\s)\\b(he|she|it)\\s+(${COMMON_VERBS.filter(v => v !== 'have').join('|')})\\b`, 'gi'), fix: m => `${m[1]} ${thirdPersonForm(m[2].toLowerCase())}`, category: 'agreement', explanation: 'In the simple present, He / She / It take verb + s (he works, she goes).', explanation_ta: 'Simple Present-இல் He / She / It உடன் வினைக்கு -s / -es சேர்க்கவும்.' },
  { re: new RegExp(`\\b(${[...MODALS].join('|')})\\s+(${COMMON_VERBS.map(thirdPersonForm).join('|')})\\b`, 'gi'), fix: m => `${m[1]} ${COMMON_VERBS[COMMON_VERBS.map(thirdPersonForm).indexOf(m[2].toLowerCase())]}`, category: 'modal', explanation: 'After can / could / will / should, use the base verb (no -s).', explanation_ta: 'can / could / will / should-க்குப் பின் வினையின் அடிப்படை வடிவம் (-s இல்லாமல்).' },
  { re: /\ba\s+([aeiou]\w*)/gi, fix: m => (A_EXCEPTIONS.test(m[1]) ? m[0] : `${matchCase(m[0], 'an')} ${m[1]}`), category: 'article', explanation: 'Use "an" before a vowel sound (an apple, an engineer).', explanation_ta: 'உயிர் ஒலிக்கு முன் "an" பயன்படுத்தவும்.' },
  { re: /\ban\s+([b-df-hj-np-tv-z]\w*)/gi, fix: m => (AN_EXCEPTIONS.test(m[1]) ? m[0] : `${matchCase(m[0], 'a')} ${m[1]}`), category: 'article', explanation: 'Use "a" before a consonant sound (a laptop, a user).', explanation_ta: 'மெய் ஒலிக்கு முன் "a" பயன்படுத்தவும்.' },
  { re: /\bi\s+am\s+(engineer|developer|teacher|doctor|student|manager|tester|architect|lead|programmer)\b/gi, fix: m => `I am ${/^[aeiou]/i.test(m[1]) ? 'an' : 'a'} ${m[1]}`, category: 'article', explanation: 'Use "a" or "an" before a job: I am a developer / I am an engineer.', explanation_ta: 'வேலையைச் சொல்லும்போது "a" / "an" சேர்க்கவும்.' },
  { re: /\b(\d+|two|three|four|five|six|seven|eight|nine|ten|many)\s+(bug|brother|sister|friend|meeting|year|day|book|user|test)\b(?!s)/gi, fix: m => `${m[1]} ${m[2]}s`, category: 'plural', explanation: 'After a number greater than one, use the plural noun.', explanation_ta: 'ஒன்றுக்கு மேற்பட்ட எண்ணுக்குப் பின் பன்மை வடிவம்.' },
];

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?\n]+[.!?]*/g) ?? []).map(s => s.trim()).filter(Boolean);
}

export function checkSentence(sentence: string): { corrected: string; corrections: Correction[] } {
  let s = sentence;
  const corrections: Correction[] = [];
  for (const r of RULES) {
    r.re.lastIndex = 0;
    const before = s;
    s = s.replace(r.re, (...args) => {
      const m = args.slice(0, -2) as unknown as RegExpExecArray;
      return r.fix(m);
    });
    if (s !== before) corrections.push({ original: before, corrected: s, explanation: r.explanation, explanation_ta: r.explanation_ta, category: r.category });
  }
  // lone lowercase "i"
  if (/(^|\s)i(\s|'|$)/.test(s)) {
    const before = s;
    s = s.replace(/(^|\s)i(?=\s|'|$)/g, '$1I');
    corrections.push({ original: before, corrected: s, explanation: 'The word "I" is always a capital letter.', explanation_ta: '"I" எப்போதும் பெரிய எழுத்தில்.', category: 'capitalization' });
  }
  if (/^[a-z]/.test(s)) {
    const before = s;
    s = s[0].toUpperCase() + s.slice(1);
    corrections.push({ original: before, corrected: s, explanation: 'Start every sentence with a capital letter.', explanation_ta: 'ஒவ்வொரு வாக்கியமும் பெரிய எழுத்தில் தொடங்க வேண்டும்.', category: 'capitalization' });
  }
  if (!/[.!?]$/.test(s)) {
    const before = s;
    s = s + (/^(what|where|when|who|why|how|do|does|did|is|are|can|could|would|will|should)\b/i.test(s) ? '?' : '.');
    corrections.push({ original: before, corrected: s, explanation: 'End every sentence with a full stop (.) or a question mark (?).', explanation_ta: 'வாக்கியத்தின் முடிவில் முற்றுப்புள்ளி (.) அல்லது கேள்விக்குறி (?) இடவும்.', category: 'punctuation' });
  }
  return { corrected: s, corrections };
}

export interface OpenTask {
  prompt: string;
  answer: string;
  keywords?: string[];
  minSentences?: number;
  sample?: string;
}

const MINOR = new Set(['capitalization', 'punctuation']);

export function rulesEvaluate(task: OpenTask): Evaluation {
  const text = (task.answer ?? '').trim();
  if (!text) {
    return { score: 0, corrections: [], natural_version: '', feedback: 'No answer was given. Try writing at least one simple sentence.', evaluator: 'rules' };
  }
  const sentences = splitSentences(text);
  const corrections: Correction[] = [];
  const fixed: string[] = [];
  for (const s of sentences) {
    const r = checkSentence(s);
    // Show one row per sentence: original sentence → fully corrected sentence, with the main reason.
    if (r.corrections.length) {
      const main = r.corrections.find(c => !MINOR.has(c.category)) ?? r.corrections[0];
      corrections.push({ ...main, original: s, corrected: r.corrected, explanation: r.corrections.map(c => c.explanation).filter((v, i, a) => a.indexOf(v) === i).join(' ') });
    }
    fixed.push(r.corrected);
  }
  const all = sentences.flatMap(x => checkSentence(x).corrections);
  const major = all.filter(c => !MINOR.has(c.category)).length;
  const minor = all.length - major;
  const words = text.split(/\s+/).filter(Boolean).length;
  const minS = task.minSentences ?? 1;
  const kws = (task.keywords ?? []).map(k => k.toLowerCase());
  const lower = ' ' + text.toLowerCase().replace(/[^a-z' ]/g, ' ') + ' ';
  const hits = kws.filter(k => lower.includes(` ${k} `) || lower.includes(` ${k}s `) || lower.includes(k)).length;

  const grammar = Math.max(0, 100 - major * 15 - minor * 4);
  const completeness = Math.min(100, Math.round((Math.min(sentences.length, minS) / minS) * 100));
  const relevance = kws.length ? Math.round((hits / kws.length) * 100) : 100;
  const length = Math.min(100, Math.round((words / Math.max(4, minS * 4)) * 100));
  const score = Math.round(grammar * 0.5 + completeness * 0.2 + relevance * 0.2 + length * 0.1);

  const tips: string[] = [];
  if (major === 0 && minor === 0) tips.push('Great — no grammar mistakes found.');
  else if (major === 0) tips.push('Good sentences. Just check capital letters and punctuation.');
  else tips.push(`Found ${major} grammar point${major > 1 ? 's' : ''} to fix. Read the corrections and say the corrected sentences aloud.`);
  if (sentences.length < minS) tips.push(`Write at least ${minS} sentences.`);
  if (kws.length && hits < kws.length) tips.push(`Try to answer the question fully (use words like: ${kws.filter(k => !lower.includes(k)).join(', ')}).`);

  return {
    score,
    corrections,
    natural_version: fixed.join(' '),
    professional_version: task.sample,
    feedback: tips.join(' '),
    repeat_practice: corrections.length ? `Say this three times: "${fixed[0]}"` : undefined,
    criteria: { grammar, completeness, relevance, length },
    evaluator: 'rules',
  };
}
