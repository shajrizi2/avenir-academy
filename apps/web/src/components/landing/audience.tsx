import { Briefcase, Compass, GraduationCap, Megaphone, Store } from 'lucide-react';
import { getLandingMessages } from '@/i18n/server';
import { FeatureCard } from './feature-card';
import { LandingSection } from './landing-section';

const ICONS = [Briefcase, Store, Megaphone, GraduationCap, Compass];

export async function Audience() {
  const { t } = await getLandingMessages();
  return (
    <LandingSection id="audience" eyebrow={t.audience.eyebrow} title={t.audience.title}>
      {/* Five cards: centered rows of 3 + 2 on desktop, 2 + 2 + 1 on tablets. */}
      <ul className="flex flex-wrap justify-center gap-6">
        {t.audience.items.map((item, i) => (
          <li key={item.title} className="w-full sm:w-[calc(50%-12px)] lg:w-[calc((100%-48px)/3)]">
            <FeatureCard icon={ICONS[i]} title={item.title} text={item.text} />
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}
