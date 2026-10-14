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
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { CompleteLessonDto } from './dto/complete-lesson.dto.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
import type { LessonSummaryRecord } from './lesson.view.js';
import {
  type LessonDetailRecord,
  LessonsService,
  type NextLessonRecord,
} from './lessons.service.js';

@ApiTags('lessons')
@ApiBearerAuth()
@Controller()
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  /** Same access as the module page. */
  @Get('modules/:id/lessons')
  list(
    @CurrentUser() user: AuthUser,
    @Param('id') moduleId: string,
  ): Promise<LessonSummaryRecord[]> {
    return this.lessons.list(user, moduleId);
  }

  @Get('lessons/:id')
  find(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<LessonDetailRecord> {
    return this.lessons.find(user, id);
  }

  @Roles(Role.STUDENT)
  @Post('lessons/:id/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CompleteLessonDto,
  ): Promise<LessonSummaryRecord> {
    return this.lessons.complete(user, id, dto.done ?? true);
  }

  /** The "continue where you left off" card on the dashboard. */
  @Roles(Role.STUDENT)
  @Get('me/next-lesson')
  next(@CurrentUser() user: AuthUser): Promise<NextLessonRecord | null> {
    return this.lessons.nextForStudent(user.id);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post('modules/:id/lessons')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id') moduleId: string,
    @Body() dto: CreateLessonDto,
  ): Promise<LessonSummaryRecord> {
    return this.lessons.create(user, moduleId, dto);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Put('modules/:id/lessons/order')
  reorder(
    @CurrentUser() user: AuthUser,
    @Param('id') moduleId: string,
    @Body() dto: ReorderLessonsDto,
  ): Promise<LessonSummaryRecord[]> {
    return this.lessons.reorder(user, moduleId, dto);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Patch('lessons/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
  ): Promise<LessonSummaryRecord> {
    return this.lessons.update(user, id, dto);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Delete('lessons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.lessons.remove(user, id);
  }
}
