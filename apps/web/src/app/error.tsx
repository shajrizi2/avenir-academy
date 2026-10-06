'use client';

import { TriangleAlert } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';

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
          title="Something went wrong"
          description="We couldn't load this page. The service may be temporarily unavailable."
          action={<Button onClick={retry}>Try again</Button>}
        />
      </div>
    </main>
  );
}
