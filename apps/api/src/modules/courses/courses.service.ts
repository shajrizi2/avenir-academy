import type { CourseDetail, CourseSummary } from '@ai-academy/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateCourseDto } from './dto/create-course.dto.js';
import type { UpdateCourseDto } from './dto/update-course.dto.js';

/** API-side shapes: identical to the shared contract except dates are Date objects. */
type WithDates<T> = Omit<T, 'startDate'> & { startDate: Date | null };
export type CourseSummaryRecord = WithDates<CourseSummary>;
export type CourseDetailRecord = WithDates<CourseDetail>;

const courseFields = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  titleSq: true,
  summarySq: true,
  coverUrl: true,
  startDate: true,
  isPublished: true,
  priceCents: true,
  listPriceCents: true,
  currency: true,
} as const satisfies Prisma.CourseSelect;

const courseDetailSelect = {
  ...courseFields,
  description: true,
  descriptionSq: true,
  modules: {
    orderBy: { order: 'asc' },
    select: {
      id: true,
      order: true,
      title: true,
      description: true,
      titleSq: true,
      descriptionSq: true,
      durationWeeks: true,
      instructor: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} as const satisfies Prisma.CourseSelect;

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeUnpublished = false): Promise<CourseSummaryRecord[]> {
    const courses = await this.prisma.course.findMany({
      where: includeUnpublished ? undefined : { isPublished: true },
      orderBy: [{ startDate: { sort: 'asc', nulls: 'last' } }, { title: 'asc' }],
      select: { ...courseFields, _count: { select: { modules: true } } },
    });
    return courses.map(({ _count, ...course }) => ({ ...course, moduleCount: _count.modules }));
  }

  async findBySlug(slug: string, includeUnpublished = false): Promise<CourseDetailRecord> {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      select: courseDetailSelect,
    });
    if (!course || (!course.isPublished && !includeUnpublished)) {
      throw new NotFoundException('Kursi nuk u gjet');
    }
    return course;
  }

  async findById(id: string): Promise<CourseDetailRecord> {
    const course = await this.prisma.course.findUnique({
      where: { id },
      select: courseDetailSelect,
    });
    if (!course) throw new NotFoundException('Kursi nuk u gjet');
    return course;
  }

  create(dto: CreateCourseDto): Promise<CourseDetailRecord> {
    return this.prisma.course.create({
      data: { ...dto, startDate: dto.startDate ? new Date(dto.startDate) : undefined },
      select: courseDetailSelect,
    });
  }

  async update(id: string, dto: UpdateCourseDto): Promise<CourseDetailRecord> {
    await this.ensureExists(id);
    return this.prisma.course.update({
      where: { id },
      data: { ...dto, startDate: dto.startDate ? new Date(dto.startDate) : undefined },
      select: courseDetailSelect,
    });
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    try {
      await this.prisma.course.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'Ky kurs ka regjistrime dhe nuk mund të fshihet. Çpublikoje në vend të kësaj.',
        );
      }
      throw error;
    }
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.course.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('Kursi nuk u gjet');
  }
}
