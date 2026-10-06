import { Injectable } from '@nestjs/common';
import type { Locale, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const publicTestimonialSelect = {
  id: true,
  name: true,
  role: true,
  quote: true,
  avatarUrl: true,
  locale: true,
} as const satisfies Prisma.TestimonialSelect;

export type PublicTestimonialRecord = Prisma.TestimonialGetPayload<{
  select: typeof publicTestimonialSelect;
}>;

/** Public read side. Admin CRUD is planned for Sprint 2 (see docs/PLAN.md). */
@Injectable()
export class TestimonialsService {
  constructor(private readonly prisma: PrismaService) {}

  listPublished(locale?: Locale): Promise<PublicTestimonialRecord[]> {
    return this.prisma.testimonial.findMany({
      where: { isPublished: true, locale },
      select: publicTestimonialSelect,
      orderBy: { createdAt: 'desc' },
    });
  }
}
