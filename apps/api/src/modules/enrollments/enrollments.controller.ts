import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { type EnrollmentRecord, EnrollmentsService } from './enrollments.service.js';

@ApiTags('enrollments')
@ApiBearerAuth()
@Controller()
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Roles(Role.STUDENT)
  @Post('courses/:id/enroll')
  enroll(@CurrentUser() user: AuthUser, @Param('id') courseId: string): Promise<EnrollmentRecord> {
    return this.enrollments.request(user.id, courseId);
  }

  @Get('me/enrollments')
  mine(@CurrentUser() user: AuthUser): Promise<EnrollmentRecord[]> {
    return this.enrollments.listForUser(user.id);
  }
}
