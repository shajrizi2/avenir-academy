'use client';

import { PageHeader } from '@/components/page-header';
import { ProfileForm } from '@/components/profile-form';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <>
      <PageHeader
        title="Profile"
        description="Your personal details. Your email is used to log in."
      />
      <Card className="rounded-xl">
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>
    </>
  );
}
