import { discountPercent, formatPrice } from '@ai-academy/shared';
import { format } from '@/i18n/format';
import { getLandingMessages } from '@/i18n/server';
import { getTracks } from '@/lib/landing-data';

/** "€89 në muaj në vend të €150", from the courses' prices (nothing hard-coded). */
export async function HeroPrice() {
  const [{ t }, tracks] = await Promise.all([getLandingMessages(), getTracks()]);
  const course = tracks?.[0];
  if (!course) return null;
  const price = formatPrice(course.priceCents, course.currency);
  const percent = discountPercent(course.priceCents, course.listPriceCents);
  const listPrice =
    percent > 0 && course.listPriceCents
      ? formatPrice(course.listPriceCents, course.currency)
      : null;
  return (
    <p className="text-ink mt-6 text-lg font-bold">
      {listPrice ? (
        <>
          {format(t.hero.priceLine, { price, listPrice: '' }).replace(/\s+$/, '')}{' '}
          <s className="text-ink-soft font-medium">{listPrice}</s>
          <span className="bg-track-marketing-tint text-track-marketing-ink ml-2 rounded-full px-2 py-0.5 text-sm">
            {format(t.tracks.discount, { percent })}
          </span>
        </>
      ) : (
        format(t.offer.priceValue, { price })
      )}
    </p>
  );
}
