import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { CreateTestimonialDto } from './dto/create-testimonial.dto.js';
import { ListTestimonialsQueryDto } from './dto/list-testimonials-query.dto.js';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto.js';
import {
  type AdminTestimonialRecord,
  type PublicTestimonialRecord,
  TestimonialsService,
} from './testimonials.service.js';

@ApiTags('testimonials')
@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly testimonials: TestimonialsService) {}

  /** Published testimonials; admins can pass `all=true` to include drafts. */
  @Public()
  @Get()
  list(
    @Query() query: ListTestimonialsQueryDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<PublicTestimonialRecord[] | AdminTestimonialRecord[]> {
    return query.all && user?.role === Role.ADMIN
      ? this.testimonials.listAll(query.locale)
      : this.testimonials.listPublished(query.locale);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateTestimonialDto): Promise<AdminTestimonialRecord> {
    return this.testimonials.create(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTestimonialDto,
  ): Promise<AdminTestimonialRecord> {
    return this.testimonials.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.testimonials.remove(id);
  }
}
