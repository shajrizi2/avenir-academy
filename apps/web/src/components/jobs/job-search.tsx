'use client';

import {
  JOB_CATEGORY_SLUGS,
  JOB_SEARCH_MAX_LENGTH,
  type JobBoardPage,
  type JobCategory,
} from '@ai-academy/shared';
import { Search } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n/messages';

const s = t.jobs.search;

/**
 * The board's one control (PLAN D37): a centred search bar and a job-type dropdown. A plain GET
 * form, so it works before the page's script loads; picking a type searches at once.
 */
export function JobSearch({
  q,
  category,
  categories,
  preview,
}: {
  q: string;
  category: JobCategory | null;
  categories: JobBoardPage['categories'];
  preview: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={form}
      action="/"
      method="get"
      role="search"
      aria-label={s.label}
      className="mx-auto flex w-full max-w-3xl flex-col gap-2 sm:flex-row"
    >
      {preview && <input type="hidden" name="preview" value="" />}
      <label className="relative flex-1">
        <span className="sr-only">{s.label}</span>
        <Search
          aria-hidden
          className="text-ink-soft pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
        />
        <input
          type="search"
          name="q"
          defaultValue={q}
          maxLength={JOB_SEARCH_MAX_LENGTH}
          placeholder={s.placeholder}
          className="border-ink bg-background text-ink placeholder:text-ink-soft focus-visible:ring-ring/50 h-12 w-full border-2 pr-4 pl-12 text-base outline-none focus-visible:ring-3"
        />
      </label>
      <label className="sm:w-60">
        <span className="sr-only">{s.type}</span>
        <select
          name="kategoria"
          defaultValue={category ? JOB_CATEGORY_SLUGS[category] : ''}
          onChange={() => form.current?.requestSubmit()}
          className="border-ink bg-background text-ink focus-visible:ring-ring/50 h-12 w-full border-2 px-3 text-base outline-none focus-visible:ring-3"
        >
          <option value="">{s.allTypes}</option>
          {categories.map((c) => (
            <option key={c.category} value={JOB_CATEGORY_SLUGS[c.category]}>
              {t.jobs.categories[c.category]} ({c.count})
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" variant="chunky" className="h-12 px-6 text-base">
        {s.submit}
      </Button>
    </form>
  );
}
