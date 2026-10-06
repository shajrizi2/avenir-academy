import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 items-center px-4 py-16">
      <div className="w-full">
        <EmptyState
          icon={SearchX}
          title="Page not found"
          description="The page you're looking for doesn't exist or has moved."
          action={
            <Button asChild>
              <Link href="/">Go home</Link>
            </Button>
          }
        />
      </div>
    </main>
  );
}
