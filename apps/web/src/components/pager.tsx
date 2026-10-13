'use client';

import { Button } from '@/components/ui/button';
import { fmt, t } from '@/i18n/messages';

interface PagerProps {
  page: number;
  pageSize: number;
  total: number;
  /** The plural noun for the count, e.g. "përdorues". */
  noun: string;
  onPage: (page: number) => void;
}

export function Pager({ page, pageSize, total, noun, onPage }: PagerProps) {
  if (total === 0) return null;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="text-ink-soft flex items-center justify-between gap-4 text-sm">
      <span>{fmt(t.common.pageOf, { count: total, noun, page, pages: pageCount })}</span>
      <div className="flex gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          {t.common.previous}
        </Button>
        <Button variant="outline" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          {t.common.next}
        </Button>
      </div>
    </div>
  );
}
