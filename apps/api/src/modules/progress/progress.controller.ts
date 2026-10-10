import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { UpdateProgressDto } from './dto/update-progress.dto.js';
import {
  type CourseProgressRecord,
  type ProgressRecord,
  ProgressService,
} from './progress.service.js';

@ApiTags('progress')
@ApiBearerAuth()
@Controller()
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Roles(Role.STUDENT)
  @Get('me/progress')
  mine(@CurrentUser() user: AuthUser): Promise<CourseProgressRecord[]> {
    return this.progress.forStudent(user.id);
  }

  /** Manual unlock / attempt reset (ACTIVE) or manual pass (PASSED). */
  @Roles(Role.ADMIN)
  @Patch('progress/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProgressDto): Promise<ProgressRecord> {
    return this.progress.update(id, dto.status);
  }
}
