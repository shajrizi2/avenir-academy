import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Flags obvious hard-coded English in JSX, so copy keeps coming from messages/sq.json.
 * It is a heuristic: JSX text and the usual copy attributes are checked for common English
 * words. Product names, codes and technical labels are allowed.
 */

const ROOT = join(__dirname, '..');
/** Generated or English-by-design files. */
const SKIP = [
  'components/ui/',
  'app/(site)/design/',
  'app/[locale]/opengraph-image.tsx',
  'components/illustrations/',
];

const ENGLISH_WORDS =
  /\b(the|and|your|you|are|is|not|with|for|from|this|that|please|log in|login|sign up|register|create|account|password|course|courses|module|modules|session|sessions|lesson|lessons|student|students|save|cancel|delete|edit|loading|saving|welcome|dashboard|profile|settings|payment|payments|enroll|enrollment|group|groups|open|close|next|previous|back|submit|search|filter|approve|decline|pending|passed|failed|locked|active|upcoming|past|download|upload|attendance|instructor|instructors|admin|question|questions|answer|answers|test|tests|result|results|schedule|material|materials|email|phone|name|title|description|date|time|minutes|hours|seat|seats|price|month|months|week|weeks|day|days|no|yes|all|none|new|add|remove|manage|view|again|something|wrong|error|required|invalid|confirm|refund|waitlist|try)\b/i;

/** Things that look English but are fine. */
const ALLOWED =
  /^(Google Meet|Google Analytics|Stripe|Avenir Academy|AI Academy|AI|SEO|IBAN|SWIFT\/BIC|WhatsApp|Email|E-mail|Markdown|CSV|URL|YouTube|Vimeo|OK|ID|PDF|©|Vibe Coding|Development & Vibe Coding përmes AI|Digital Marketing & AI|SEO përmes AI|\d+|[^A-Za-z]*)$/;

const ATTRIBUTES = ['title', 'label', 'placeholder', 'description', 'aria-label', 'alt'];

function* files(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (path.endsWith('.tsx')) yield path;
  }
}

function suspicious(text: string): boolean {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean || ALLOWED.test(clean)) return false;
  // Albanian text has its own letters and words; a sentence with ë/ç or common Albanian
  // function words is Albanian even if it contains an English product name.
  if (
    /[ëçË]/.test(clean) ||
    /\b(dhe|për|të|në|me|një|nga|që|ose|nuk|është|janë|ka|si|kjo|ky|çdo|sa|kur|ti|ty|ne)\b/.test(
      clean,
    )
  ) {
    return false;
  }
  return ENGLISH_WORDS.test(clean);
}

describe('no hard-coded English in JSX', () => {
  const offenders: string[] = [];
  for (const file of files(ROOT)) {
    const rel = relative(ROOT, file);
    if (SKIP.some((s) => rel.startsWith(s))) continue;
    const source = readFileSync(file, 'utf8');
    // Text between tags on one line: >Some text< (JSX expressions {…} are excluded).
    for (const match of source.matchAll(/>([^<>{}\n]+)</g)) {
      // Generics and arrows (`useState<T>('x')`, `=> {`) also sit between > and <.
      if (/^[\s(]|[;=`]/.test(match[1])) continue;
      if (suspicious(match[1])) offenders.push(`${rel}: "${match[1].trim()}"`);
    }
    // String literal props that carry copy.
    for (const attr of ATTRIBUTES) {
      const re = new RegExp(`\\b${attr}=["']([^"']+)["']`, 'g');
      for (const match of source.matchAll(re)) {
        if (suspicious(match[1])) offenders.push(`${rel}: ${attr}="${match[1]}"`);
      }
    }
  }

  it('finds none', () => {
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
