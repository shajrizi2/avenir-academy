import type { Paginated } from '@ai-academy/shared';
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { DecideEnrollmentDto } from './dto/decide-enrollment.dto.js';
import { ListEnrollmentsQueryDto } from './dto/list-enrollments-query.dto.js';
import { MoveEnrollmentDto } from './dto/move-enrollment.dto.js';
import {
  type AdminEnrollmentRecord,
  type EnrollmentRecord,
  EnrollmentsService,
} from './enrollments.service.js';

@ApiTags('enrollments')
@ApiBearerAuth()
@Controller()
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  /** Legacy: a request without payment, for an admin to approve. Checkout is the normal path. */
  @Roles(Role.STUDENT)
  @Post('courses/:id/enroll')
  enroll(@CurrentUser() user: AuthUser, @Param('id') courseId: string): Promise<EnrollmentRecord> {
    return this.enrollments.request(user.id, courseId);
  }

  @Get('me/enrollments')
  mine(@CurrentUser() user: AuthUser): Promise<EnrollmentRecord[]> {
    return this.enrollments.listForUser(user.id);
  }

  @Roles(Role.ADMIN)
  @Get('enrollments')
  list(@Query() query: ListEnrollmentsQueryDto): Promise<Paginated<AdminEnrollmentRecord>> {
    return this.enrollments.listForAdmin(query);
  }

  @Roles(Role.ADMIN)
  @Patch('enrollments/:id')
  decide(
    @Param('id') id: string,
    @Body() dto: DecideEnrollmentDto,
  ): Promise<AdminEnrollmentRecord> {
    return this.enrollments.decide(id, dto);
  }

  /** Waitlist → a group with a free seat (held 48 hours, the student is emailed). */
  @Roles(Role.ADMIN)
  @Patch('enrollments/:id/move')
  move(@Param('id') id: string, @Body() dto: MoveEnrollmentDto): Promise<AdminEnrollmentRecord> {
    return this.enrollments.move(id, dto.groupId);
  }
}
