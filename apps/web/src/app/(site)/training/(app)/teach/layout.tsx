import { RoleGate } from '@/components/layout/role-gate';

// Role-gated on the client after the session restores; see (app)/layout.tsx.
export const instant = false;

/** Instructors manage their own modules here (the API checks ownership); admins manage all. */
export default function TeachLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate roles={['INSTRUCTOR', 'ADMIN']}>{children}</RoleGate>;
}
