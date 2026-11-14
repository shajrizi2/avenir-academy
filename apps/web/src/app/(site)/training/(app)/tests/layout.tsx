import { RoleGate } from '@/components/layout/role-gate';

// Role-gated on the client after the session restores; see (app)/layout.tsx.
export const instant = false;

/** Students take their module tests here. */
export default function TestsLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate roles={['STUDENT']}>{children}</RoleGate>;
}
