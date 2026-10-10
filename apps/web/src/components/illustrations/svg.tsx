import { cn } from '@/lib/utils';

/**
 * Shared frame for our illustrations: flat shapes in the track colours with a 2px ink
 * outline. Decorative only (aria-hidden); the surrounding copy carries the meaning.
 */
export function IllustrationSvg({
  viewBox = '0 0 240 180',
  className,
  children,
}: {
  viewBox?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox={viewBox}
      aria-hidden
      focusable="false"
      className={cn('stroke-ink h-auto w-full', className)}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** A four-point sparkle centred on (x, y). */
export function Sparkle({
  x,
  y,
  r,
  className,
}: {
  x: number;
  y: number;
  r: number;
  className?: string;
}) {
  const k = r * 0.22;
  return (
    <path
      className={className}
      d={`M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`}
    />
  );
}

export interface IllustrationProps {
  className?: string;
}
