import { DEFAULT_LOCALE } from '@ai-academy/shared';
import { redirect } from 'next/navigation';

/** "/" is normally redirected by proxy.ts (with language detection); this is the fallback. */
export default function RootPage() {
  redirect(`/${DEFAULT_LOCALE}`);
}
