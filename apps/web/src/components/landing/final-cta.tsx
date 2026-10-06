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
    <section aria-labelledby="final-cta-title" className="bg-primary">
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div className="reveal">
          <h2
            id="final-cta-title"
            className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl"
          >
            {t.finalCta.title}
          </h2>
          <p className="mt-4 max-w-xl text-lg text-indigo-100">{t.finalCta.text}</p>
          <CtaLink
            href="/register"
            cta="final_register"
            locale={locale}
            variant="secondary"
            size="lg"
            className="mt-8 h-12 bg-white px-6 text-base text-indigo-700 hover:bg-indigo-50"
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
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-white hover:bg-white/10 focus-visible:bg-white/10';
  return (
    <div className="reveal rounded-2xl bg-white/10 p-6 ring-1 ring-white/20">
      <h3 className="px-3 font-semibold text-white">{t.contact.title}</h3>
      <ul className="mt-3 space-y-1">
        {email && (
          <li>
            <a href={`mailto:${email}`} className={linkClass}>
              <Mail className="size-5 text-indigo-200" aria-hidden />
              <span className="sr-only">{t.contact.email}: </span>
              {email}
            </a>
          </li>
        )}
        {phone && (
          <li>
            <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={linkClass}>
              <Phone className="size-5 text-indigo-200" aria-hidden />
              <span className="sr-only">{t.contact.phone}: </span>
              {phone}
            </a>
          </li>
        )}
      </ul>
      {whatsapp && (
        <Button
          asChild
          size="lg"
          className="mt-4 h-11 w-full bg-green-700 text-white hover:bg-green-800"
        >
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden /> {t.contact.whatsapp}
          </a>
        </Button>
      )}
      {organization}
    </div>
  );
}
