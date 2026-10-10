import { BadgeCheck, Footprints, LifeBuoy } from 'lucide-react';
import { ChatSparkles, HelloBubble, LaptopCode } from '@/components/illustrations';
import { getLandingMessages } from '@/i18n/server';
import { FeatureCard } from './feature-card';
import { FeatureRows } from './feature-rows';
import { SectionHeading } from './landing-section';

/** The first three benefits get an illustrated row each; the rest are compact cards. */
const ROW_ILLUSTRATIONS = [ChatSparkles, LaptopCode, HelloBubble];
const CARD_ICONS = [BadgeCheck, Footprints, LifeBuoy];

export async function Benefits() {
  const { t } = await getLandingMessages();
  const rows = t.benefits.items.slice(0, ROW_ILLUSTRATIONS.length);
  const cards = t.benefits.items.slice(ROW_ILLUSTRATIONS.length);
  return (
    <section id="why-us" aria-labelledby="why-us-title" data-tone="white" className="scroll-mt-16">
      <div className="bg-soft px-4 pt-16 sm:px-6 lg:pt-28">
        <SectionHeading id="why-us" eyebrow={t.benefits.eyebrow} title={t.benefits.title} />
      </div>
      <FeatureRows
        firstTone="soft"
        rows={rows.map((item, i) => ({ ...item, Illustration: ROW_ILLUSTRATIONS[i] }))}
      />
      <ul className="bg-background mx-auto grid w-full max-w-[1200px] gap-6 px-4 pt-4 pb-16 sm:px-6 md:grid-cols-3 lg:pb-28">
        {cards.map((item, i) => (
          <li key={item.title}>
            <FeatureCard icon={CARD_ICONS[i]} title={item.title} text={item.text} tone={i} />
          </li>
        ))}
      </ul>
    </section>
  );
}
