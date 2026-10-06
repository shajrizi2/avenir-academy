import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth-card';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Register for free, then request a place in a course."
      footer={
        <span>
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </span>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
