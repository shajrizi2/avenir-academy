'use client';

import type { Role } from '@ai-academy/shared';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navItemsFor } from './nav-items';

interface SidebarNavProps {
  role: Role;
  onNavigate?: () => void;
}

export function SidebarNav({ role, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const items = navItemsFor(role);
  // The most specific matching item is active (so /admin/users doesn't also light up /admin).
  const active = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <nav aria-label="Sidebar" className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={active?.href === href ? 'page' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            active?.href === href && 'bg-accent text-accent-foreground hover:bg-accent',
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
