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

function at(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((v, key) => (v as Record<string, unknown>)?.[key], value);
}

describe('messages', () => {
  it('have every English key in Albanian too (Albanian is the source of truth)', () => {
    const missing = keyPaths(en).filter((path) => at(sq, path) === undefined);
    expect(missing).toEqual([]);
  });

  it('have no empty strings', () => {
    for (const text of [...leaves(sq), ...leaves(en)]) expect(text.trim()).not.toBe('');
  });

  it('use the same placeholders in both languages where a key exists in both', () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const path of keyPaths(en)) {
      const english = at(en, path);
      const albanian = at(sq, path);
      if (typeof english === 'string' && typeof albanian === 'string') {
        expect(placeholders(albanian), path).toBe(placeholders(english));
      }
    }
  });

  it('keep 8 FAQ entries, 5 audiences, 6 steps, 6 benefits and 3 why-now points', () => {
    for (const { landing } of [sq, en]) {
      expect(landing.faq.items).toHaveLength(8);
      expect(landing.audience.items).toHaveLength(5);
      expect(landing.howItWorks.steps).toHaveLength(6);
      expect(landing.benefits.items).toHaveLength(6);
      expect(landing.whyNow.points).toHaveLength(3);
      expect(landing.proof.items).toHaveLength(3);
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

  it('mark placeholder copy the team must fill in', () => {
    // The refund policy is a placeholder until the product owner writes it.
    expect(sq.landing.faq.items[1].answer).toMatch(/^\[.*\]$/);
  });
});
