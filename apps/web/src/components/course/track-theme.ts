import { Code2, Megaphone } from 'lucide-react';
import { LaptopCode, MegaphoneChart } from '@/components/illustrations';

export type TrackKind = 'ai' | 'marketing';

/** Which accent a course uses. Tracks are told apart by slug (no category field yet). */
export function trackKind(slug: string): TrackKind {
  return slug.includes('marketing') ? 'marketing' : 'ai';
}

/** Full class names per track, so Tailwind can see them. */
export const TRACK_THEME = {
  ai: {
    tint: 'bg-track-ai-tint',
    fill: 'bg-track-ai',
    ink: 'text-track-ai-ink',
    badge: 'ai',
    Icon: Code2,
    Illustration: LaptopCode,
  },
  marketing: {
    tint: 'bg-track-marketing-tint',
    fill: 'bg-track-marketing',
    ink: 'text-track-marketing-ink',
    badge: 'marketing',
    Icon: Megaphone,
    Illustration: MegaphoneChart,
  },
} as const;

export function trackTheme(slug: string) {
  return TRACK_THEME[trackKind(slug)];
}
