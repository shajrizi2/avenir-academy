import type { CourseSummary } from '@ai-academy/shared';
import { ArrowRight, CalendarDays, Layers } from 'lucide-react';
import Link from 'next/link';
import { LocalDateTime } from '@/components/local-date-time';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function CourseCard({ course }: { course: CourseSummary }) {
  return (
    <Card className="h-full rounded-xl transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">
          <Link href={`/courses/${course.slug}`} className="after:absolute after:inset-0">
            {course.title}
          </Link>
        </CardTitle>
        <CardDescription>{course.summary}</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground mt-auto flex flex-wrap gap-4 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <Layers className="size-4" aria-hidden />
          {course.moduleCount} modules
        </span>
        {course.startDate && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden />
            Starts <LocalDateTime value={course.startDate} options={{ dateStyle: 'medium' }} />
          </span>
        )}
      </CardContent>
      <CardFooter>
        <span className="text-primary inline-flex items-center gap-1 text-sm font-medium">
          View course <ArrowRight className="size-4" aria-hidden />
        </span>
      </CardFooter>
    </Card>
  );
}
