import type { Role } from '@ai-academy/shared';
import {
  BookOpen,
  ClipboardCheck,
  CreditCard,
  Inbox,
  LayoutDashboard,
  Library,
  Mail,
  Presentation,
  Quote,
  Settings,
  Shield,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { t } from '@/i18n/messages';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Sidebar entries per role. Only routes that exist are listed. */
export function navItemsFor(role: Role): NavItem[] {
  const profile = { href: '/profile', label: t.nav.profile, icon: UserRound };
  const catalog = { href: '/courses', label: t.nav.catalog, icon: BookOpen };
  switch (role) {
    case 'ADMIN':
      return [
        { href: '/admin', label: t.nav.adminOverview, icon: Shield },
        { href: '/admin/enrollments', label: t.nav.enrollments, icon: Inbox },
        { href: '/admin/groups', label: t.nav.groups, icon: UsersRound },
        { href: '/admin/payments', label: t.nav.payments, icon: CreditCard },
        { href: '/admin/emails', label: t.nav.emails, icon: Mail },
        { href: '/admin/courses', label: t.nav.adminCourses, icon: Library },
        { href: '/teach', label: t.nav.teaching, icon: ClipboardCheck },
        { href: '/admin/users', label: t.nav.users, icon: Users },
        { href: '/admin/instructors', label: t.nav.instructors, icon: Presentation },
        { href: '/admin/testimonials', label: t.nav.testimonials, icon: Quote },
        { href: '/admin/settings', label: t.nav.settings, icon: Settings },
        profile,
      ];
    case 'INSTRUCTOR':
      return [
        { href: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
        { href: '/teach', label: t.nav.myModules, icon: ClipboardCheck },
        catalog,
        profile,
      ];
    case 'STUDENT':
      return [
        { href: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
        catalog,
        profile,
      ];
  }
}
