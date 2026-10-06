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
    <LandingSection
      id="testimonials"
      tone="muted"
      eyebrow={t.testimonials.eyebrow}
      title={t.testimonials.title}
    >
      <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((item) => (
          <li key={item.id}>
            <figure className="reveal flex h-full flex-col rounded-xl border bg-white p-6">
              <Quote className="size-6 text-indigo-300" aria-hidden />
              <blockquote className="mt-3 flex-1 leading-7 text-slate-700">
                <p>{item.quote}</p>
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <PersonAvatar name={item.name} src={item.avatarUrl} size={44} />
                <span>
                  <span className="block font-semibold text-slate-900">{item.name}</span>
                  {item.role && <span className="block text-sm text-slate-600">{item.role}</span>}
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}
