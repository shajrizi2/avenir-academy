import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth-card';
import { PathUnlock } from '@/components/illustrations';
import { t } from '@/i18n/messages';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata: Metadata = { title: t.meta.pages.forgotPassword };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      illustration={PathUnlock}
      title={t.auth.forgot.title}
      description={t.auth.forgot.description}
      footer={
        <Link href="/login" className="text-ink font-bold underline underline-offset-4">
          {t.auth.forgot.backToLogin}
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
