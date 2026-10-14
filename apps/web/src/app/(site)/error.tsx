'use client';

import { TriangleAlert } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n/messages';

export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 items-center px-4 py-16">
      <div className="w-full">
        <EmptyState
          icon={TriangleAlert}
          title={t.errors.pageTitle}
          description={t.errors.pageText}
          action={<Button onClick={retry}>{t.common.retry}</Button>}
        />
      </div>
    </main>
  );
}
