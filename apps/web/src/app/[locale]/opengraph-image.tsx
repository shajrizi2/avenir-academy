import { isLocale } from '@ai-academy/shared';
import { ImageResponse } from 'next/og';
import { getMessages } from '@/i18n/messages';

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
        background: '#ffffff',
        backgroundImage:
          'linear-gradient(to right, #eef2ff 1px, transparent 1px), linear-gradient(to bottom, #eef2ff 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        color: '#0f172a',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 32, fontWeight: 700 }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: '#4f46e5',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
          }}
        >
          AI
        </div>
        AI Academy
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 80, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
          {hero.title}
        </div>
        <div style={{ fontSize: 32, color: '#475569', lineHeight: 1.35, maxWidth: 1000 }}>
          {hero.eyebrow}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {hero.path.modules.map((name, i) => (
          <div
            key={name}
            style={{
              display: 'flex',
              padding: '10px 18px',
              borderRadius: 999,
              fontSize: 22,
              background: i === 0 ? '#dcfce7' : i === 1 ? '#fef3c7' : '#f1f5f9',
              color: i === 0 ? '#15803d' : i === 1 ? '#92400e' : '#475569',
            }}
          >
            {name}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
