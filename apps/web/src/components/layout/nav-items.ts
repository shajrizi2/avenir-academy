import type { Role } from '@ai-academy/shared';
import {
  BookOpen,
  Briefcase,
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
  const profile = { href: '/training/profile', label: t.nav.profile, icon: UserRound };
  const catalog = { href: '/training/courses', label: t.nav.catalog, icon: BookOpen };
  switch (role) {
    case 'ADMIN':
      return [
        { href: '/training/admin', label: t.nav.adminOverview, icon: Shield },
        { href: '/training/admin/enrollments', label: t.nav.enrollments, icon: Inbox },
        { href: '/training/admin/groups', label: t.nav.groups, icon: UsersRound },
        { href: '/training/admin/payments', label: t.nav.payments, icon: CreditCard },
        { href: '/training/admin/emails', label: t.nav.emails, icon: Mail },
        { href: '/training/admin/courses', label: t.nav.adminCourses, icon: Library },
        { href: '/training/admin/jobs', label: t.nav.jobs, icon: Briefcase },
        { href: '/training/teach', label: t.nav.teaching, icon: ClipboardCheck },
        { href: '/training/admin/users', label: t.nav.users, icon: Users },
        { href: '/training/admin/instructors', label: t.nav.instructors, icon: Presentation },
        { href: '/training/admin/testimonials', label: t.nav.testimonials, icon: Quote },
        { href: '/training/admin/settings', label: t.nav.settings, icon: Settings },
        profile,
      ];
    case 'INSTRUCTOR':
      return [
        { href: '/training/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
        { href: '/training/teach', label: t.nav.myModules, icon: ClipboardCheck },
        catalog,
        profile,
      ];
    case 'STUDENT':
      return [
        { href: '/training/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
        catalog,
        profile,
      ];
  }
}
