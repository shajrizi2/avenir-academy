import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthCard } from '@/components/auth-card';
import { PathUnlock } from '@/components/illustrations';
import { Skeleton } from '@/components/ui/skeleton';
import { ResetPasswordForm } from './reset-password-form';

export const metadata: Metadata = { title: 'Choose a new password' };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      illustration={PathUnlock}
      title="Choose a new password"
      description="Pick a new password for your account. You'll be signed out on other devices."
      footer={
        <Link href="/login" className="text-ink font-bold underline underline-offset-4">
          Back to log in
        </Link>
      }
    >
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
