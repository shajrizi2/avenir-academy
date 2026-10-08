import type { Role } from '@ai-academy/shared';
import {
  BookOpen,
  ClipboardCheck,
  Inbox,
  LayoutDashboard,
  Library,
  Presentation,
  Quote,
  Settings,
  Shield,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';

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
        { href: '/admin/enrollments', label: 'Enrollments', icon: Inbox },
        { href: '/admin/courses', label: 'Courses', icon: Library },
        { href: '/teach', label: 'Teaching', icon: ClipboardCheck },
        { href: '/admin/users', label: 'Users', icon: Users },
        { href: '/admin/instructors', label: 'Instructors', icon: Presentation },
        { href: '/admin/testimonials', label: 'Testimonials', icon: Quote },
        { href: '/admin/settings', label: 'Site settings', icon: Settings },
        profile,
      ];
    case 'INSTRUCTOR':
      return [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/teach', label: 'My modules', icon: ClipboardCheck },
        catalog,
        profile,
      ];
    case 'STUDENT':
      return [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }, catalog, profile];
  }
}
