import type { Locale } from '@ai-academy/shared';
import Link from 'next/link';
import { Suspense } from 'react';
import { Logo } from '@/components/logo';
import { getLandingMessages } from '@/i18n/server';
import { getSiteSettings, getTracks } from '@/lib/landing-data';
import { LanguageSwitch } from './language-switch';

const linkClass = 'text-ink-soft hover:text-ink font-medium underline-offset-4 hover:underline';

export async function LandingFooter() {
  const { locale, t } = await getLandingMessages();
  const otherLocale: Locale = locale === 'sq' ? 'en' : 'sq';
  return (
    <footer className="border-line bg-background border-t">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-2 gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.5fr_repeat(4,1fr)]">
        <div className="col-span-2 max-w-xs space-y-4 md:col-span-1">
          <Logo href={`/${locale}`} />
          <p className="text-ink-soft text-sm leading-6">{t.footer.tagline}</p>
          <LanguageSwitch
            target={otherLocale}
            label={t.nav.switchTo}
            srLabel={t.nav.language}
            className="-ml-3"
          />
        </div>
        <FooterColumn title={t.footer.platform}>
          <li>
            <a href="#how-it-works" className={linkClass}>
              {t.nav.howItWorks}
            </a>
          </li>
          <li>
            <a href="#tracks" className={linkClass}>
              {t.nav.tracks}
            </a>
          </li>
          <li>
            <a href="#faq" className={linkClass}>
              {t.nav.faq}
            </a>
          </li>
        </FooterColumn>
        <FooterColumn title={t.footer.courses}>
          <Suspense>
            <TrackLinks />
          </Suspense>
          <li>
            <Link href="/courses" className={linkClass}>
              {t.footer.allCourses}
            </Link>
          </li>
        </FooterColumn>
        <FooterColumn title={t.footer.company}>
          <li>
            <a href="#why-us" className={linkClass}>
              {t.benefits.eyebrow}
            </a>
          </li>
          <li>
            <a href="#cohort" className={linkClass}>
              {t.cohort.eyebrow}
            </a>
          </li>
          <li>
            <Link href="/register" className={linkClass}>
              {t.nav.register}
            </Link>
          </li>
          <li>
            <Link href="/login" className={linkClass}>
              {t.nav.login}
            </Link>
          </li>
        </FooterColumn>
        <FooterColumn title={t.footer.contact}>
          <Suspense>
            <ContactLinks />
          </Suspense>
        </FooterColumn>
      </div>
      <div className="border-line border-t">
        <p className="text-ink-soft mx-auto w-full max-w-[1200px] px-4 py-6 text-sm sm:px-6">
          © AI Academy. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-ink text-sm font-extrabold">{title}</h2>
      <ul className="mt-4 space-y-3 text-sm">{children}</ul>
    </nav>
  );
}

async function TrackLinks() {
  const tracks = await getTracks();
  return tracks?.map((track) => (
    <li key={track.id}>
      <Link href={`/courses/${track.slug}`} className={linkClass}>
        {track.title}
      </Link>
    </li>
  ));
}

async function ContactLinks() {
  const [{ t }, settings] = await Promise.all([getLandingMessages(), getSiteSettings()]);
  const { contactEmail: email, contactPhone: phone, whatsappNumber: whatsapp } = settings ?? {};
  if (!email && !phone && !whatsapp) {
    return <li className="text-ink-soft">{t.footer.contactSoon}</li>;
  }
  return (
    <>
      {email && (
        <li>
          <a href={`mailto:${email}`} className={linkClass}>
            {email}
          </a>
        </li>
      )}
      {phone && (
        <li>
          <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={linkClass}>
            {phone}
          </a>
        </li>
      )}
      {whatsapp && (
        <li>
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            WhatsApp
          </a>
        </li>
      )}
    </>
  );
}
