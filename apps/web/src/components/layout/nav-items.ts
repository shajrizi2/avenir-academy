import type { Role } from '@ai-academy/shared';
import { BookOpen, LayoutDashboard, Shield, UserRound, Users, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Sidebar entries per role. Only routes that exist are listed. */
export function navItemsFor(role: Role): NavItem[] {
  const profile = { href: '/profile', label: 'Profile', icon: UserRound };
  const catalog = { href: '/courses', label: 'Course catalog', icon: BookOpen };
  switch (role) {
    case 'ADMIN':
      return [
        { href: '/admin', label: 'Overview', icon: Shield },
        { href: '/admin/users', label: 'Users', icon: Users },
        catalog,
        profile,
      ];
    case 'INSTRUCTOR':
      return [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }, catalog, profile];
    case 'STUDENT':
      return [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }, catalog, profile];
  }
}
