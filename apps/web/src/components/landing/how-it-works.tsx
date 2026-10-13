import {
  CardPayment,
  LaptopCode,
  LiveClass,
  MailCalendar,
  SignUpCard,
  TestCheck,
} from '@/components/illustrations';
import { getLandingMessages } from '@/i18n/server';
import { CtaLink } from './cta-link';
import { FeatureRows } from './feature-rows';
import { SectionHeading } from './landing-section';

/** One illustration per step: register, pay, email, live, offline, test. */
const ILLUSTRATIONS = [SignUpCard, CardPayment, MailCalendar, LiveClass, LaptopCode, TestCheck];

export async function HowItWorks() {
  const { locale, t } = await getLandingMessages();
  const { steps } = t.howItWorks;
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-title" className="scroll-mt-16">
      <div className="bg-soft px-4 pt-16 sm:px-6 lg:pt-28">
        <SectionHeading
          id="how-it-works"
          eyebrow={t.howItWorks.eyebrow}
          title={t.howItWorks.title}
          intro={t.howItWorks.intro}
        />
      </div>
      <FeatureRows
        as="ol"
        firstTone="soft"
        rows={steps.map((step, i) => ({
          ...step,
          kicker: `${i + 1} / ${steps.length}`,
          Illustration: ILLUSTRATIONS[i],
        }))}
      />
      <div className="bg-background flex justify-center px-4 pt-4 pb-16 lg:pb-28">
        <CtaLink
          href="/register"
          cta="how_it_works_register"
          locale={locale}
          variant="chunky"
          size="lg"
        >
          {t.howItWorks.cta}
        </CtaLink>
      </div>
    </section>
  );
}
