import { Quote } from 'lucide-react';
import { getLandingMessages } from '@/i18n/server';
import { getTestimonials } from '@/lib/landing-data';
import { LandingSection } from './landing-section';
import { PersonAvatar } from './person-avatar';

/**
 * Real, published testimonials for the current language. Renders nothing until some
 * exist: we never show placeholder or invented quotes.
 */
export async function Testimonials() {
  const { locale, t } = await getLandingMessages();
  const testimonials = await getTestimonials(locale);
  if (testimonials.length === 0) return null;

  return (
    <LandingSection id="testimonials" eyebrow={t.testimonials.eyebrow} title={t.testimonials.title}>
      <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((item) => (
          <li key={item.id}>
            <figure className="reveal border-line rounded-card bg-background flex h-full flex-col border p-6 sm:p-8">
              <Quote className="text-track-ai size-8" aria-hidden />
              <blockquote className="text-ink mt-4 flex-1 text-lg leading-8">
                <p>{item.quote}</p>
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <PersonAvatar name={item.name} src={item.avatarUrl} size={44} />
                <span>
                  <span className="text-ink block font-bold">{item.name}</span>
                  {item.role && <span className="text-ink-soft block text-sm">{item.role}</span>}
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}
