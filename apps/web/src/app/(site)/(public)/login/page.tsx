import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthCard } from '@/components/auth-card';
import { ChatSparkles } from '@/components/illustrations';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: t.meta.pages.login };

export default function LoginPage() {
  return (
    <AuthCard
      illustration={ChatSparkles}
      title={t.auth.login.title}
      description={t.auth.login.description}
      footer={
        <span>
          {t.auth.login.noAccount}{' '}
          <Link href="/register" className="text-ink font-bold underline underline-offset-4">
            {t.auth.login.register}
          </Link>
        </span>
      }
    >
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
