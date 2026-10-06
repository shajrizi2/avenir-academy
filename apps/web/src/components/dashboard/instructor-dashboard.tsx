import { Presentation } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';

export function InstructorDashboard() {
  return (
    <EmptyState
      icon={Presentation}
      title="Your teaching space"
      description="The modules assigned to you, your upcoming live sessions and your students' test results will appear here."
    />
  );
}
