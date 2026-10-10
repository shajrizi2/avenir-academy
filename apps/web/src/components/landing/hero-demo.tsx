'use client';

import type { Locale } from '@ai-academy/shared';
import { ArrowRight, Check, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import {
  ChatSparkles,
  LaptopCode,
  MegaphoneChart,
  NeuralNetwork,
} from '@/components/illustrations';
import type { LandingMessages } from '@/i18n/messages';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { CtaLink } from './cta-link';

type Demo = LandingMessages['hero']['demo'];

/** One illustration per topic tab, in the order of `demo.topics`. */
const ILLUSTRATIONS = [NeuralNetwork, LaptopCode, MegaphoneChart, ChatSparkles];

/**
 * The hero's "learn by doing" demo: pick a topic, answer one question, get instant
 * feedback. Pure client state; nothing is sent anywhere except an analytics event.
 */
export function HeroDemo({ demo, locale }: { demo: Demo; locale: Locale }) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  function selectTab(index: number) {
    const next = (index + demo.topics.length) % demo.topics.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div
        role="tablist"
        aria-label={demo.tablistLabel}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
      >
        {demo.topics.map((topic, i) => (
          <button
            key={topic.tab}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${baseId}-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`${baseId}-panel`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') selectTab(i + 1);
              else if (e.key === 'ArrowLeft') selectTab(i - 1);
              else if (e.key === 'Home') selectTab(0);
              else if (e.key === 'End') selectTab(demo.topics.length - 1);
            }}
            className={cn(
              'focus-visible:ring-ring/50 h-11 shrink-0 rounded-full border-2 px-5 text-sm font-bold whitespace-nowrap transition-colors outline-none focus-visible:ring-3',
              active === i
                ? 'border-ink bg-ink text-primary-foreground'
                : 'border-line-strong bg-background text-ink hover:border-ink',
            )}
          >
            {topic.tab}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${active}`}
        className="border-ink rounded-card bg-background mt-4 grid overflow-hidden border-2 shadow-[0_6px_0_var(--ink)] md:grid-cols-[2fr_3fr]"
      >
        {/* Remount per topic so the answer state resets when the tab changes. */}
        <Question key={active} index={active} demo={demo} locale={locale} />
      </div>
    </div>
  );
}

function Question({ index, demo, locale }: { index: number; demo: Demo; locale: Locale }) {
  const topic = demo.topics[index];
  const Illustration = ILLUSTRATIONS[index % ILLUSTRATIONS.length];
  const [picked, setPicked] = useState<number | null>(null);
  const solved = picked === topic.answer;

  function pick(option: number) {
    setPicked(option);
    track('demo_answer', { topic: index, correct: option === topic.answer, locale });
  }

  return (
    <>
      <div className="bg-track-ai-tint hidden items-center justify-center p-8 md:flex">
        <Illustration className="max-w-64" />
      </div>
      <div className="p-5 text-left sm:p-8">
        <p className="text-track-ai-ink text-sm font-bold tracking-wide uppercase">
          {demo.eyebrow}
        </p>
        <h2 className="text-ink text-subheading mt-2 font-extrabold text-balance">
          {topic.question}
        </h2>
        <ul className="mt-5 space-y-3">
          {topic.options.map((option, i) => {
            const state =
              picked === i ? (i === topic.answer ? 'correct' : 'wrong') : solved ? 'idle' : 'open';
            return (
              <li key={option}>
                <button
                  type="button"
                  disabled={solved}
                  aria-pressed={picked === i}
                  onClick={() => pick(i)}
                  className={cn(
                    'rounded-card focus-visible:ring-ring/50 flex w-full items-start gap-3 p-4 text-left font-semibold outline-none focus-visible:ring-3',
                    state === 'correct' &&
                      'border-passed bg-passed-tint text-ink animate-pop border-2 shadow-[0_4px_0_var(--passed-ink)]',
                    state === 'wrong' &&
                      'border-failed bg-failed-tint text-ink animate-shake border-2 shadow-[0_4px_0_var(--failed-ink)]',
                    state === 'open' &&
                      'pressable border-line-strong bg-background text-ink hover:border-ink [--press:var(--border-strong)]',
                    state === 'idle' && 'border-line text-ink-soft border-2',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold',
                      state === 'correct' && 'border-passed-ink bg-passed text-primary-foreground',
                      state === 'wrong' && 'border-failed-ink bg-failed text-primary-foreground',
                      (state === 'open' || state === 'idle') && 'border-line-strong',
                    )}
                  >
                    {state === 'correct' ? (
                      <Check className="size-3.5" strokeWidth={3} />
                    ) : state === 'wrong' ? (
                      <X className="size-3.5" strokeWidth={3} />
                    ) : (
                      String.fromCharCode(65 + i)
                    )}
                  </span>
                  <span>{option}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div aria-live="polite" className="min-h-6">
          {picked !== null && !solved && (
            <p className="text-failed-ink mt-4 font-semibold" data-testid="demo-feedback">
              {demo.incorrect} {demo.tryAgain}
            </p>
          )}
          {solved && (
            <div className="mt-5 space-y-4" data-testid="demo-feedback">
              <p className="text-ink">
                <span className="text-passed-ink font-extrabold">{demo.correct}</span>{' '}
                {topic.explanation}
              </p>
              <div className="border-line flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-ink-soft text-sm font-medium">{demo.outro}</p>
                <CtaLink
                  href="/register"
                  cta="hero_demo_start"
                  locale={locale}
                  variant="chunky"
                  className="self-start sm:self-auto"
                >
                  {demo.cta} <ArrowRight data-icon="inline-end" />
                </CtaLink>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
