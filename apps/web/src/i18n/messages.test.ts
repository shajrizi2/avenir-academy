import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import sq from '../../messages/sq.json';

/** Lists every key path, including array indexes, e.g. "landing.faq.items.0.question". */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

function leaves(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value === null || typeof value !== 'object') return [];
  return Object.values(value).flatMap(leaves);
}

describe('landing messages', () => {
  it('have exactly the same keys in Albanian and English', () => {
    expect(keyPaths(en).sort()).toEqual(keyPaths(sq).sort());
  });

  it('have no empty strings', () => {
    for (const text of [...leaves(sq), ...leaves(en)]) expect(text.trim()).not.toBe('');
  });

  it('use the same placeholders in both languages', () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(',');
    const sqLeaves = leaves(sq);
    const enLeaves = leaves(en);
    sqLeaves.forEach((text, i) => expect(placeholders(enLeaves[i])).toBe(placeholders(text)));
  });

  it('keep 8 FAQ entries, 5 audiences, 4 steps and 3 why-now points', () => {
    for (const { landing } of [sq, en]) {
      expect(landing.faq.items).toHaveLength(8);
      expect(landing.audience.items).toHaveLength(5);
      expect(landing.howItWorks.steps).toHaveLength(4);
      expect(landing.whyNow.points).toHaveLength(3);
      expect(landing.proof.items).toHaveLength(3);
      expect(landing.dates.months).toHaveLength(12);
    }
  });

  it('give every hero demo question a valid answer, the same in both languages', () => {
    expect(sq.landing.hero.demo.topics).toHaveLength(4);
    sq.landing.hero.demo.topics.forEach((topic, i) => {
      const english = en.landing.hero.demo.topics[i];
      expect(english.options).toHaveLength(topic.options.length);
      expect(english.answer).toBe(topic.answer);
      expect(topic.answer).toBeGreaterThanOrEqual(0);
      expect(topic.answer).toBeLessThan(topic.options.length);
    });
  });
});
