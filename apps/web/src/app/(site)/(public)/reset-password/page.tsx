import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthCard } from '@/components/auth-card';
import { PathUnlock } from '@/components/illustrations';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';
import { ResetPasswordForm } from './reset-password-form';

export const metadata: Metadata = { title: t.meta.pages.resetPassword };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      illustration={PathUnlock}
      title={t.auth.reset.title}
      description={t.auth.reset.description}
      footer={
        <Link href="/login" className="text-ink font-bold underline underline-offset-4">
          {t.auth.forgot.backToLogin}
        </Link>
      }
    >
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
