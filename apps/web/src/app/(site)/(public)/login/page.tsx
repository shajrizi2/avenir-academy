import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthCard } from '@/components/auth-card';
import { ChatSparkles } from '@/components/illustrations';
import { Skeleton } from '@/components/ui/skeleton';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <AuthCard
      illustration={ChatSparkles}
      title="Welcome back"
      description="Log in to join your live sessions and track your progress."
      footer={
        <span>
          New here?{' '}
          <Link href="/register" className="text-ink font-bold underline underline-offset-4">
            Create an account
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
