import { ImageResponse } from 'next/og';
import { WORDMARK_PATH } from '@/components/brand/wordmark-path';
import { getMessages } from '@/i18n/messages';

/** ImageResponse can't read CSS variables, so the design tokens (globals.css) are copied here. */
const INK = '#111111';
const INK_SOFT = '#555555';
const BG = '#ffffff';
/** Black and white only (PLAN D35). */
const PILLS = [
  { background: '#111111', color: '#ffffff' },
  { background: '#ffffff', color: '#111111', border: '2px solid #111111' },
];

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Avenir Academy';

/** Social preview card per locale, generated from the hero copy. */
export default function OpengraphImage() {
  const { hero } = getMessages().landing;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: BG,
        color: INK,
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 34, fontWeight: 800 }}
      >
        <svg viewBox="0 0 585 184" width={230} height={72}>
          <path fill={INK} fillRule="evenodd" d={WORDMARK_PATH} />
        </svg>
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
