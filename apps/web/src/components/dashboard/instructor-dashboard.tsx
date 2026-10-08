import { TeachingModules } from '@/components/teach/teaching-modules';

export function InstructorDashboard() {
  return (
    <section className="space-y-4" aria-labelledby="my-modules">
      <h2 id="my-modules" className="text-ink text-subheading font-extrabold">
        Your modules
      </h2>
      <TeachingModules />
    </section>
  );
}
