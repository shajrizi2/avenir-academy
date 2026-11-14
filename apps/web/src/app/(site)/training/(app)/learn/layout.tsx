import { RoleGate } from '@/components/layout/role-gate';

// Role-gated on the client after the session restores; see (app)/layout.tsx.
export const instant = false;

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate roles={['STUDENT']}>{children}</RoleGate>;
}
