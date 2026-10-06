import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';

export default function CourseNotFound() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6">
      <EmptyState
        icon={SearchX}
        title="Course not found"
        description="This course doesn't exist or isn't open for enrollment."
        action={
          <Button asChild variant="outline">
            <Link href="/courses">Browse courses</Link>
          </Button>
        }
      />
    </div>
  );
}
