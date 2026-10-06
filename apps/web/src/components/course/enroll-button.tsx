'use client';

import type { EnrollmentSummary } from '@ai-academy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { myEnrollmentsQuery } from '@/lib/queries';

interface EnrollButtonProps {
  courseId: string;
  courseSlug: string;
}

/** Sends logged-out visitors to login; lets students request enrollment and shows its status. */
export function EnrollButton({ courseId, courseSlug }: EnrollButtonProps) {
  const { status, user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const queryClient = useQueryClient();
  const enrollments = useQuery({ ...myEnrollmentsQuery, enabled: isStudent });

  const enroll = useMutation({
    mutationFn: () =>
      apiFetch<EnrollmentSummary>(`/courses/${courseId}/enroll`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Request sent. An admin will review your enrollment shortly.');
      void queryClient.invalidateQueries({ queryKey: myEnrollmentsQuery.queryKey });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (status === 'loading' || (isStudent && enrollments.isPending)) {
    return <Skeleton className="h-9 w-40" />;
  }

  if (!user) {
    return (
      <Button asChild size="lg">
        <Link href={`/login?next=${encodeURIComponent(`/courses/${courseSlug}`)}`}>Enroll</Link>
      </Button>
    );
  }

  if (!isStudent) {
    return (
      <p className="text-muted-foreground text-sm">Enrollment is available to student accounts.</p>
    );
  }

  const existing = enrollments.data?.find((e) => e.course.id === courseId);
  if (existing?.status === 'APPROVED') {
    return (
      <p className="inline-flex items-center gap-2 text-sm font-medium text-green-700">
        <CheckCircle2 className="size-4" aria-hidden /> You are enrolled in this course.
      </p>
    );
  }
  if (existing?.status === 'PENDING') {
    return (
      <p className="inline-flex items-center gap-2 text-sm font-medium text-amber-800">
        <Clock className="size-4" aria-hidden /> Your request is waiting for admin approval.
      </p>
    );
  }
  if (existing?.status === 'REJECTED') {
    return (
      <p className="text-muted-foreground text-sm">
        Your request for this course was declined. Please contact us if you have questions.
      </p>
    );
  }

  return (
    <Button size="lg" onClick={() => enroll.mutate()} disabled={enroll.isPending}>
      {enroll.isPending ? 'Sending request…' : 'Enroll'}
    </Button>
  );
}
