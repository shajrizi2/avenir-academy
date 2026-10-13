import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth-card';
import { SignUpCard } from '@/components/illustrations';
import { t } from '@/i18n/messages';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: t.meta.pages.register };

export default function RegisterPage() {
  return (
    <AuthCard
      illustration={SignUpCard}
      title={t.auth.register.title}
      description={t.auth.register.description}
      footer={
        <span>
          {t.auth.register.haveAccount}{' '}
          <Link href="/login" className="text-ink font-bold underline underline-offset-4">
            {t.auth.register.login}
          </Link>
        </span>
      }
    >
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}
