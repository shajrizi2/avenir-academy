import { isLocale } from '@ai-academy/shared';
import { ImageResponse } from 'next/og';
import { getMessages } from '@/i18n/messages';

/** ImageResponse can't read CSS variables, so the design tokens (globals.css) are copied here. */
const INK = '#141414';
const INK_SOFT = '#5b5b5b';
const BG_SOFT = '#f7f6f3';
const PILLS = [
  { background: '#f0ecff', color: '#5b3be0' },
  { background: '#fff1e6', color: '#b4500c' },
];

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'AI Academy';

/** Social preview card per locale, generated from the hero copy. */
export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { hero } = getMessages(isLocale(locale) ? locale : 'sq').landing;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: BG_SOFT,
        color: INK,
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 34, fontWeight: 800 }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: INK,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: 4,
            paddingBottom: 12,
          }}
        >
          <div style={{ width: 9, height: 12, borderRadius: 3, background: '#ff8a3d' }} />
          <div style={{ width: 9, height: 21, borderRadius: 3, background: '#7c5cfc' }} />
          <div style={{ width: 9, height: 31, borderRadius: 3, background: '#ffffff' }} />
        </div>
        AI Academy
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
          {hero.title}
        </div>
        <div style={{ fontSize: 32, color: INK_SOFT, lineHeight: 1.35, maxWidth: 1000 }}>
          {hero.eyebrow}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {hero.demo.topics.map(({ tab }, i) => (
          <div
            key={tab}
            style={{
              display: 'flex',
              padding: '12px 22px',
              borderRadius: 999,
              fontSize: 24,
              fontWeight: 700,
              ...PILLS[i % PILLS.length],
            }}
          >
            {tab}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
