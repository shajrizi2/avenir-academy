import type { Role } from '@ai-academy/shared';

/** Where each role lands after logging in. */
export function homeFor(role: Role): string {
  return role === 'ADMIN' ? '/admin' : '/dashboard';
}

/** Only allow same-site relative redirects (prevents open redirects via ?next=). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}
