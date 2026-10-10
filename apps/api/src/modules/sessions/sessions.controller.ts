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
import { CreateSessionDto } from './dto/create-session.dto.js';
import { SaveAttendanceDto } from './dto/save-attendance.dto.js';
import { UpdateSessionDto } from './dto/update-session.dto.js';
import type { SessionView } from './session.view.js';
import {
  type SessionAttendanceRecord,
  SessionsService,
  type StaffSessionRecord,
  type StudentSessionRecord,
} from './sessions.service.js';

/** Instructors manage sessions of their own modules only (checked in the service). */
@ApiTags('sessions')
@ApiBearerAuth()
@Controller()
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Get('modules/:id/sessions')
  list(
    @CurrentUser() user: AuthUser,
    @Param('id') moduleId: string,
  ): Promise<StaffSessionRecord[]> {
    return this.sessions.listForModule(user, moduleId);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post('modules/:id/sessions')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id') moduleId: string,
    @Body() dto: CreateSessionDto,
  ): Promise<SessionView> {
    return this.sessions.create(user, moduleId, dto);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Patch('sessions/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
  ): Promise<SessionView> {
    return this.sessions.update(user, id, dto);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.sessions.remove(user, id);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Get('sessions/:id/attendance')
  attendance(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<SessionAttendanceRecord> {
    return this.sessions.getAttendance(user, id);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Put('sessions/:id/attendance')
  saveAttendance(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SaveAttendanceDto,
  ): Promise<SessionAttendanceRecord> {
    return this.sessions.saveAttendance(user, id, dto);
  }

  @Roles(Role.STUDENT)
  @Get('me/sessions/upcoming')
  upcoming(@CurrentUser() user: AuthUser): Promise<StudentSessionRecord[]> {
    return this.sessions.upcomingForStudent(user.id);
  }
}
