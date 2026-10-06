import { GraduationCap } from 'lucide-react';
import Link from 'next/link';

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold text-slate-900">
      <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
        <GraduationCap className="size-5" aria-hidden />
      </span>
      <span>AI Academy</span>
    </Link>
  );
}
