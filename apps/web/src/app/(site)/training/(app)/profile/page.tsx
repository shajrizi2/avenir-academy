import type { Metadata } from 'next';
import { ProfileView } from '@/components/profile-view';
import { t } from '@/i18n/messages';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: t.meta.pages.profile };

export default function ProfilePage() {
  return <ProfileView />;
}
