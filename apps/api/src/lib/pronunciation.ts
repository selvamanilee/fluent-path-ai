// Heuristic syllable guide for text-only pronunciation help (not an assessment).
const DIFFICULT: Array<[RegExp, string]> = [
  [/th/i, '"th": put your tongue lightly between your teeth (think, this). Not "t" or "d".'],
  [/v/i, '"v": touch your top teeth to your lower lip and use your voice. Different from "w".'],
  [/w/i, '"w": round your lips, teeth do not touch. Different from "v".'],
  [/z/i, '"z": like "s" but with voice — feel a buzz.'],
  [/(^|[^s])sh/i, '"sh": lips slightly forward (ship, she).'],
  [/[aeiou]r($|[^aeiou])/i, 'In Indian/British-style English the "r" after a vowel is soft (car, work).'],
  [/ed$/i, 'Past "-ed" endings: /t/ after voiceless sounds (worked), /d/ after voiced (played), /ɪd/ after t or d (needed).'],
];

export function splitSyllables(word: string): string[] {
  const w = word.toLowerCase();
  const parts = w.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/g);
  return parts && parts.join('') === w ? parts : [w];
}

export function syllableGuide(text: string) {
  const words = text.trim().split(/\s+/).slice(0, 12);
  return {
    words: words.map(w => ({ word: w, syllables: splitSyllables(w.replace(/[^a-zA-Z']/g, '')) })),
    tips: DIFFICULT.filter(([re]) => re.test(text)).map(([, t]) => t).slice(0, 3),
  };
}
