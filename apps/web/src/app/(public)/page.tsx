import { ArrowRight, BadgeCheck, CalendarCheck, ClipboardCheck, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { CourseGrid, CourseGridSkeleton } from '@/components/course/course-grid';
import { Button } from '@/components/ui/button';

const steps = [
  {
    icon: UserPlus,
    title: 'Register and request a course',
    text: 'Create a free account and request enrollment in the track you want to follow.',
  },
  {
    icon: BadgeCheck,
    title: 'Get approved',
    text: 'An admin confirms your place and Module 1 unlocks on your dashboard.',
  },
  {
    icon: CalendarCheck,
    title: 'Learn live on Google Meet',
    text: 'Each module runs for about a month of live sessions with your instructor.',
  },
  {
    icon: ClipboardCheck,
    title: 'Pass the test, unlock the next module',
    text: 'Finish each module with a short online test. Score 70% or more to move on.',
  },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b bg-white">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl space-y-6">
            <p className="text-primary text-sm font-semibold">Live courses · Real instructors</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Learn AI and digital marketing, one live module at a time
            </h1>
            <p className="text-lg text-slate-600">
              Go from the basics of AI to using it confidently in your profession, or build real
              marketing skills, through live sessions on Google Meet and short tests that unlock
              each next step.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/courses">
                  Browse courses <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/register">Create a free account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">How it works</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="rounded-xl border bg-white p-6">
              <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-lg">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-medium text-slate-900">
                <span className="sr-only">Step {index + 1}: </span>
                {title}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 pb-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Our tracks</h2>
          <Link href="/courses" className="text-primary text-sm font-medium hover:underline">
            All courses
          </Link>
        </div>
        <div className="mt-8">
          <Suspense fallback={<CourseGridSkeleton />}>
            <CourseGrid />
          </Suspense>
        </div>
      </section>
    </>
  );
}
