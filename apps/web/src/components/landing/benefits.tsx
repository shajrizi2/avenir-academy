import { BadgeCheck, Footprints, Hammer, Languages, LifeBuoy, Video } from 'lucide-react';
import { getLandingMessages } from '@/i18n/server';
import { FeatureCard } from './feature-card';
import { LandingSection } from './landing-section';

const ICONS = [Video, Hammer, Languages, BadgeCheck, Footprints, LifeBuoy];

export async function Benefits() {
  const { t } = await getLandingMessages();
  return (
    <LandingSection id="why-us" tone="muted" eyebrow={t.benefits.eyebrow} title={t.benefits.title}>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {t.benefits.items.map((item, i) => (
          <li key={item.title}>
            <FeatureCard icon={ICONS[i]} title={item.title} text={item.text} />
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}
