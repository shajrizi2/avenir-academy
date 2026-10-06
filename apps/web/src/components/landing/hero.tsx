import { ArrowRight } from 'lucide-react';
import { Fragment, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getLandingMessages } from '@/i18n/server';
import { CohortBadge } from './cohort-badge';
import { CtaLink } from './cta-link';
import { ModulePath } from './module-path';

export async function Hero() {
  const { locale, t } = await getLandingMessages();
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-white">
      <div aria-hidden className="hero-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:py-28">
        <div>
          <Suspense fallback={<Skeleton className="h-8 w-64 rounded-full" />}>
            <CohortBadge />
          </Suspense>
          <h1
            id="hero-title"
            className="mt-6 text-4xl font-semibold tracking-tight text-balance text-slate-900 sm:text-5xl lg:text-6xl"
          >
            {/* One sentence per line: "Learn AI." / "Use it at work." */}
            {t.hero.title.split(/(?<=\.)\s+/).map((sentence, i) => (
              <Fragment key={sentence}>
                {i > 0 && ' '}
                <span className="block">{sentence}</span>
              </Fragment>
            ))}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-pretty text-slate-600 sm:text-xl">
            {t.hero.subtitle}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaLink
              href="/register"
              cta="hero_register"
              locale={locale}
              size="lg"
              className="h-12 px-6 text-base"
            >
              {t.hero.ctaPrimary} <ArrowRight data-icon="inline-end" />
            </CtaLink>
            <CtaLink
              href="#tracks"
              cta="hero_see_courses"
              locale={locale}
              variant="outline"
              size="lg"
              className="h-12 px-6 text-base"
            >
              {t.hero.ctaSecondary}
            </CtaLink>
          </div>
          <p className="mt-6 text-sm text-slate-600">
            <span className="font-medium text-slate-900">{t.hero.eyebrow}</span>
            <span aria-hidden> · </span>
            {t.hero.trust}
          </p>
        </div>
        <ModulePath path={t.hero.path} />
      </div>
    </section>
  );
}
