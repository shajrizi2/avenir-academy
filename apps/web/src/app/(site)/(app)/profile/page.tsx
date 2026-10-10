'use client';

import { PageHeader } from '@/components/page-header';
import { ProfileForm } from '@/components/profile-form';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <>
      <PageHeader
        title="Profile"
        description="Your personal details. Your email is used to log in."
      />
      <Card>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>
    </>
  );
}
