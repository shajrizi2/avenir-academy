import { ClipboardCheck, LockOpen, UserPlus, Video } from 'lucide-react';
import { getLandingMessages } from '@/i18n/server';
import { CtaLink } from './cta-link';
import { LandingSection } from './landing-section';

const ICONS = [UserPlus, Video, ClipboardCheck, LockOpen];

export async function HowItWorks() {
  const { locale, t } = await getLandingMessages();
  return (
    <LandingSection
      id="how-it-works"
      eyebrow={t.howItWorks.eyebrow}
      title={t.howItWorks.title}
      intro={t.howItWorks.intro}
    >
      <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {/* Connector line behind the step icons on wide screens */}
        <span
          aria-hidden
          className="absolute top-6 right-[12.5%] left-[12.5%] hidden h-px bg-gradient-to-r from-indigo-200 via-indigo-300 to-indigo-200 lg:block"
        />
        {t.howItWorks.steps.map((step, i) => {
          const Icon = ICONS[i];
          return (
            <li key={step.title} className="reveal relative flex flex-col items-center text-center">
              <span className="bg-primary text-primary-foreground relative flex size-12 items-center justify-center rounded-full shadow-lg ring-8 shadow-indigo-600/20 ring-white">
                <Icon className="size-5" aria-hidden />
              </span>
              <p className="text-primary mt-4 text-xs font-semibold tracking-wide uppercase">
                {i + 1} / {t.howItWorks.steps.length}
              </p>
              <h3 className="mt-1 font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">{step.text}</p>
            </li>
          );
        })}
      </ol>
      <div className="mt-12 flex justify-center">
        <CtaLink
          href="/register"
          cta="how_it_works_register"
          locale={locale}
          size="lg"
          className="h-12 px-6 text-base"
        >
          {t.howItWorks.cta}
        </CtaLink>
      </div>
    </LandingSection>
  );
}
