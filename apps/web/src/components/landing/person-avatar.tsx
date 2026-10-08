import Image from 'next/image';
import { cn } from '@/lib/utils';

interface PersonAvatarProps {
  name: string;
  src: string | null;
  size: number;
  className?: string;
}

/** Photo from an admin-provided URL, or initials when there is none. */
export function PersonAvatar({ name, src, size, className }: PersonAvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        // Photo URLs come from arbitrary hosts entered by admins; skip the optimizer.
        unoptimized
        className={cn('rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        'bg-track-ai-tint text-track-ai-ink flex items-center justify-center rounded-full font-extrabold',
        className,
      )}
      style={{ width: size, height: size, fontSize: size / 2.8 }}
    >
      {initials}
    </span>
  );
}
