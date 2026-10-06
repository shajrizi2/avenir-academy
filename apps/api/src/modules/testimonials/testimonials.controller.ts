import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { ListTestimonialsQueryDto } from './dto/list-testimonials-query.dto.js';
import { type PublicTestimonialRecord, TestimonialsService } from './testimonials.service.js';

@ApiTags('testimonials')
@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly testimonials: TestimonialsService) {}

  @Public()
  @Get()
  list(@Query() query: ListTestimonialsQueryDto): Promise<PublicTestimonialRecord[]> {
    return this.testimonials.listPublished(query.locale);
  }
}
