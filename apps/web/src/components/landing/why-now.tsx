import { BriefcaseBusiness, Sprout, Workflow } from 'lucide-react';
import { getLandingMessages } from '@/i18n/server';
import { FeatureCard } from './feature-card';
import { LandingSection } from './landing-section';

const ICONS = [Workflow, BriefcaseBusiness, Sprout];

export async function WhyNow() {
  const { t } = await getLandingMessages();
  return (
    <LandingSection id="why-now" tone="muted" eyebrow={t.whyNow.eyebrow} title={t.whyNow.title}>
      <ul className="grid gap-6 md:grid-cols-3">
        {t.whyNow.points.map((point, i) => (
          <li key={point.title}>
            <FeatureCard icon={ICONS[i]} title={point.title} text={point.text} />
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}
