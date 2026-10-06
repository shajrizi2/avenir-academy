import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthCard } from '@/components/auth-card';
import { Skeleton } from '@/components/ui/skeleton';
import { ResetPasswordForm } from './reset-password-form';

export const metadata: Metadata = { title: 'Choose a new password' };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Choose a new password"
      description="Pick a new password for your account. You'll be signed out on other devices."
      footer={
        <Link href="/login" className="text-primary font-medium hover:underline">
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
