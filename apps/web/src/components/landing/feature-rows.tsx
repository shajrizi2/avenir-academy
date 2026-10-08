import type { IllustrationProps } from '@/components/illustrations/svg';
import { cn } from '@/lib/utils';

export interface FeatureRow {
  title: string;
  text: string;
  Illustration: React.ComponentType<IllustrationProps>;
  /** Optional small label above the heading, e.g. "1 / 4". */
  kicker?: string;
}

/**
 * Alternating left/right rows: a big bold heading and two lines of text on one side, an
 * illustration on the other. Each row is its own band, alternating white / off-white,
 * starting with `firstTone`.
 */
export function FeatureRows({
  rows,
  firstTone = 'white',
  as: List = 'ul',
}: {
  rows: FeatureRow[];
  firstTone?: 'white' | 'soft';
  as?: 'ul' | 'ol';
}) {
  const offset = firstTone === 'soft' ? 1 : 0;
  return (
    <List>
      {rows.map(({ title, text, Illustration, kicker }, i) => (
        <li
          key={title}
          className={cn('py-12 lg:py-20', (i + offset) % 2 ? 'bg-soft' : 'bg-background')}
        >
          <div className="mx-auto grid w-full max-w-[1200px] items-center gap-8 px-4 sm:px-6 md:grid-cols-2 lg:gap-16">
            <div className={cn('reveal', i % 2 && 'md:order-2')}>
              {kicker && (
                <p className="text-track-ai-ink text-sm font-bold tracking-wide uppercase">
                  {kicker}
                </p>
              )}
              <h3 className="text-ink text-heading lg:text-title mt-2 font-extrabold text-balance">
                {title}
              </h3>
              <p className="text-ink-soft mt-4 max-w-md text-lg leading-8 text-pretty">{text}</p>
            </div>
            <div
              className={cn('reveal mx-auto w-full max-w-sm lg:max-w-md', i % 2 && 'md:order-1')}
            >
              <Illustration />
            </div>
          </div>
        </li>
      ))}
    </List>
  );
}
