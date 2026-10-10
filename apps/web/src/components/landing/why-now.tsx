import { BriefcaseBusiness, Sprout, Workflow } from 'lucide-react';
import { getLandingMessages } from '@/i18n/server';
import { FeatureCard } from './feature-card';
import { LandingSection } from './landing-section';

const ICONS = [Workflow, BriefcaseBusiness, Sprout];

export async function WhyNow() {
  const { t } = await getLandingMessages();
  return (
    <LandingSection id="why-now" eyebrow={t.whyNow.eyebrow} title={t.whyNow.title}>
      <ul className="grid gap-6 lg:grid-cols-3">
        {t.whyNow.points.map((point, i) => (
          <li key={point.title}>
            <FeatureCard icon={ICONS[i]} title={point.title} text={point.text} tone={i} />
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}
