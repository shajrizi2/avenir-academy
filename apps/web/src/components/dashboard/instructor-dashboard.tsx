import { TeachingModules } from '@/components/teach/teaching-modules';
import { t } from '@/i18n/messages';

export function InstructorDashboard() {
  return (
    <section className="space-y-4" aria-labelledby="my-modules">
      <h2 id="my-modules" className="text-ink text-subheading font-extrabold">
        {t.nav.myModules}
      </h2>
      <TeachingModules />
    </section>
  );
}
