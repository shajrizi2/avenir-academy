import type { Metadata } from 'next';
import { ProfileView } from '@/components/profile-view';

// Client-gated; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: 'Profile' };

export default function ProfilePage() {
  return <ProfileView />;
}
