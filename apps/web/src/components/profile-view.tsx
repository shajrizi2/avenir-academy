'use client';

import { PageHeader } from '@/components/page-header';
import { ProfileForm } from '@/components/profile-form';
import { Card, CardContent } from '@/components/ui/card';
import { t } from '@/i18n/messages';
import { useAuth } from '@/lib/auth-context';

export function ProfileView() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <>
      <PageHeader title={t.profile.title} description={t.profile.description} />
      <Card>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>
    </>
  );
}
