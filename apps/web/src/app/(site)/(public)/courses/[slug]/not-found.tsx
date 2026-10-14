import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n/messages';

export default function CourseNotFound() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6">
      <EmptyState
        icon={SearchX}
        title={t.errors.notFoundTitle}
        description={t.errors.notFoundText}
        action={
          <Button asChild variant="outline">
            <Link href="/courses">{t.nav.browseCourses}</Link>
          </Button>
        }
      />
    </div>
  );
}
