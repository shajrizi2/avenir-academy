import { Injectable } from '@nestjs/common';
import type { Locale, Prisma } from '../../generated/prisma/client.js';
import type { CreateTestimonialDto } from './dto/create-testimonial.dto.js';
import type { UpdateTestimonialDto } from './dto/update-testimonial.dto.js';
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

const adminTestimonialSelect = {
  ...publicTestimonialSelect,
  isPublished: true,
  createdAt: true,
} as const satisfies Prisma.TestimonialSelect;

export type AdminTestimonialRecord = Prisma.TestimonialGetPayload<{
  select: typeof adminTestimonialSelect;
}>;

/** Public read side for the landing page, plus admin CRUD. Never seeded or invented. */
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

  listAll(locale?: Locale): Promise<AdminTestimonialRecord[]> {
    return this.prisma.testimonial.findMany({
      where: { locale },
      select: adminTestimonialSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateTestimonialDto): Promise<AdminTestimonialRecord> {
    return this.prisma.testimonial.create({ data: dto, select: adminTestimonialSelect });
  }

  /** A missing id becomes a 404 through the global Prisma filter (P2025). */
  update(id: string, dto: UpdateTestimonialDto): Promise<AdminTestimonialRecord> {
    return this.prisma.testimonial.update({
      where: { id },
      data: dto,
      select: adminTestimonialSelect,
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.testimonial.delete({ where: { id } });
  }
}
