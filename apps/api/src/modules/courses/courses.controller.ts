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
import {
  type CourseDetailRecord,
  type CourseSummaryRecord,
  CoursesService,
} from './courses.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { ListCoursesQueryDto } from './dto/list-courses-query.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Public()
  @Get()
  list(
    @Query() query: ListCoursesQueryDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<CourseSummaryRecord[]> {
    return this.courses.list(Boolean(query.all) && user?.role === Role.ADMIN);
  }

  @Public()
  @Get(':slug')
  findOne(
    @Param('slug') slug: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<CourseDetailRecord> {
    return this.courses.findBySlug(slug, user?.role === Role.ADMIN);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateCourseDto): Promise<CourseDetailRecord> {
    return this.courses.create(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto): Promise<CourseDetailRecord> {
    return this.courses.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.courses.remove(id);
  }
}
