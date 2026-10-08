'use client';

import { Button } from '@/components/ui/button';

interface PagerProps {
  page: number;
  pageSize: number;
  total: number;
  /** Singular noun for the count, e.g. "user". */
  noun: string;
  onPage: (page: number) => void;
}

export function Pager({ page, pageSize, total, noun, onPage }: PagerProps) {
  if (total === 0) return null;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="text-ink-soft flex items-center justify-between gap-4 text-sm">
      <span>
        {total} {noun}
        {total === 1 ? '' : 's'} · page {page} of {pageCount}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
