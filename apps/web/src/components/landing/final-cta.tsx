import { ArrowRight, Mail, MessageCircle, Phone } from 'lucide-react';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { getLandingMessages } from '@/i18n/server';
import { getSiteSettings } from '@/lib/landing-data';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { CtaLink } from './cta-link';
import { JsonLd } from './json-ld';

/** Closing call-to-action band with contact details. */
export async function FinalCta() {
  const { locale, t } = await getLandingMessages();
  return (
    <section aria-labelledby="final-cta-title" className="bg-ink">
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:py-28">
        <div className="reveal">
          <h2
            id="final-cta-title"
            className="text-primary-foreground text-title lg:text-display font-extrabold text-balance"
          >
            {t.finalCta.title}
          </h2>
          <p className="text-primary-foreground/80 mt-5 max-w-xl text-lg sm:text-xl">
            {t.finalCta.text}
          </p>
          <CtaLink
            href="/register"
            cta="final_register"
            locale={locale}
            variant="chunky-outline"
            size="xl"
            className="mt-10"
          >
            {t.finalCta.cta} <ArrowRight data-icon="inline-end" />
          </CtaLink>
        </div>
        <Suspense>
          <Contact />
        </Suspense>
      </div>
    </section>
  );
}

async function Contact() {
  const [{ t }, settings] = await Promise.all([getLandingMessages(), getSiteSettings()]);
  const email = settings?.contactEmail;
  const phone = settings?.contactPhone;
  const whatsapp = settings?.whatsappNumber;

  const organization = (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'EducationalOrganization',
        name: SITE_NAME,
        url: SITE_URL,
        ...(email && { email }),
        ...(phone && { telephone: phone }),
      }}
    />
  );
  if (!email && !phone && !whatsapp) return organization;

  const linkClass =
    'text-primary-foreground hover:bg-primary-foreground/10 focus-visible:bg-primary-foreground/10 flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5';
  return (
    <div className="reveal rounded-card bg-primary-foreground/5 border-primary-foreground/20 border-2 p-6">
      <h3 className="text-primary-foreground px-3 text-lg font-bold">{t.contact.title}</h3>
      <ul className="mt-3 space-y-1">
        {email && (
          <li>
            <a href={`mailto:${email}`} className={linkClass}>
              <Mail className="text-track-ai-tint size-5" aria-hidden />
              <span className="sr-only">{t.contact.email}: </span>
              {email}
            </a>
          </li>
        )}
        {phone && (
          <li>
            <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={linkClass}>
              <Phone className="text-track-ai-tint size-5" aria-hidden />
              <span className="sr-only">{t.contact.phone}: </span>
              {phone}
            </a>
          </li>
        )}
      </ul>
      {whatsapp && (
        <Button asChild variant="chunky-outline" size="lg" className="mt-4 w-full">
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden /> {t.contact.whatsapp}
          </a>
        </Button>
      )}
      {organization}
    </div>
  );
}
