import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthCard } from '@/components/auth-card';
import { Skeleton } from '@/components/ui/skeleton';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Log in to join your live sessions and track your progress."
      footer={
        <span>
          New here?{' '}
          <Link href="/register" className="text-primary font-medium hover:underline">
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
