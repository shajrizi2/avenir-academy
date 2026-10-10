import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getLandingMessages } from '@/i18n/server';
import { CohortBadge } from './cohort-badge';
import { CtaLink } from './cta-link';
import { HeroDemo } from './hero-demo';

export async function Hero() {
  const { locale, t } = await getLandingMessages();
  return (
    <section aria-labelledby="hero-title" className="bg-background overflow-hidden">
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-12 pb-16 text-center sm:px-6 lg:pt-20 lg:pb-28">
        <Suspense fallback={<Skeleton className="mx-auto h-9 w-64 rounded-full" />}>
          <CohortBadge />
        </Suspense>
        <h1
          id="hero-title"
          className="text-ink text-display-sm lg:text-display mx-auto mt-6 max-w-4xl font-extrabold text-balance lg:text-[4.5rem]"
        >
          {t.hero.title}
        </h1>
        <p className="text-ink-soft mx-auto mt-6 max-w-2xl text-lg leading-8 text-pretty sm:text-xl">
          {t.hero.subtitle}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <CtaLink href="/register" cta="hero_register" locale={locale} variant="chunky" size="xl">
            {t.hero.ctaPrimary}
          </CtaLink>
          <CtaLink
            href="#tracks"
            cta="hero_see_courses"
            locale={locale}
            variant="chunky-outline"
            size="xl"
          >
            {t.hero.ctaSecondary}
          </CtaLink>
        </div>
        <p className="text-ink-soft mt-5 text-sm">
          <span className="text-ink font-semibold">{t.hero.eyebrow}</span>
          <span aria-hidden> · </span>
          {t.hero.trust}
        </p>
        <div className="mt-14 lg:mt-20">
          <HeroDemo demo={t.hero.demo} locale={locale} />
        </div>
      </div>
    </section>
  );
}
