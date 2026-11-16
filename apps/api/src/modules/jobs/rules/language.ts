import { fold } from '../text.js';

/**
 * Languages a job may require of someone in Kosovo (PLAN D39): English, the languages of the
 * region, and German, which many people in Kosovo speak. A job that requires any other language
 * ("fluent Estonian", "Dutch is a must", "Finnish-speaking") is not for the board.
 */
const FOREIGN = [
  'estonian',
  'latvian',
  'lithuanian',
  'finnish',
  'swedish',
  'norwegian',
  'danish',
  'icelandic',
  'dutch',
  'flemish',
  'french',
  'spanish',
  'portuguese',
  'italian',
  'polish',
  'czech',
  'slovak',
  'hungarian',
  'romanian',
  'bulgarian',
  'greek',
  'ukrainian',
  'russian',
  'slovenian',
  'japanese',
  'korean',
  'chinese',
  'mandarin',
  'cantonese',
  'vietnamese',
  'thai',
  'indonesian',
  'bahasa',
  'malay',
  'tagalog',
  'filipino',
  'hindi',
  'bengali',
  'urdu',
  'tamil',
  'telugu',
  'marathi',
  'gujarati',
  'punjabi',
  'kannada',
  'malayalam',
  'arabic',
  'hebrew',
  'persian',
  'farsi',
  'swahili',
  'catalan',
  'basque',
  'galician',
  'afrikaans',
  'zulu',
];
/** Words that are also ordinary English ("polish the UI"): only "Polish-speaking", "Polish language". */
const AMBIGUOUS = new Set(['polish']);
const L = FOREIGN.join('|');
const SAFE = FOREIGN.filter((l) => !AMBIGUOUS.has(l)).join('|');

const NEEDS: RegExp[] = [
  // "fluent in Estonian", "native Finnish", "C1 Dutch", "excellent written and spoken French"
  new RegExp(
    `\\b(fluent|fluency|native|mother tongue|proficient|proficiency|excellent|strong|perfect|business[- ]level|professional[- ]level|c1|c2|b2)\\b[^.;\\n]{0,40}?\\b(?<lang>${SAFE})\\b`,
  ),
  // "Estonian is required", "Dutch language skills are a must"
  new RegExp(
    `\\b(?<lang>${SAFE})\\b( language)?[^.;\\n]{0,30}?\\b(required|is a must|are a must|must|mandatory|essential|necessary|needed)\\b`,
  ),
  // "Finnish-speaking", "Polish speakers", "Polish language"
  new RegExp(`\\b(?<lang>${L})[- ](speaking|speakers?|language)\\b`),
];
/** A sentence that only welcomes the language doesn't require it. */
const OPTIONAL =
  /\b(plus|nice to have|bonus|advantage|advantageous|preferred|beneficial|is a benefit|would be great|optional|desirable)\b/;

/** The foreign language a posting requires, or null. Reads the title and each sentence. */
export function requiredLanguage(title: string, description: string): string | null {
  const sentences = [title, ...description.split(/[.;!?\n]+/)].map(fold);
  for (const sentence of sentences) {
    if (OPTIONAL.test(sentence)) continue;
    for (const re of NEEDS) {
      const lang = sentence.match(re)?.groups?.lang;
      if (lang) return lang;
    }
  }
  return null;
}
