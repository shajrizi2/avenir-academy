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
import { CreateGroupDto } from './dto/create-group.dto.js';
import { ListGroupsQueryDto } from './dto/list-groups-query.dto.js';
import { UpdateGroupDto } from './dto/update-group.dto.js';
import {
  type AdminGroupRecord,
  GroupsService,
  type GroupStudentRecord,
  type GroupSummaryRecord,
} from './groups.service.js';

@ApiTags('groups')
@Controller()
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  /** Groups of published courses that can still be joined, with real seats left. */
  @Public()
  @Get('groups')
  list(@Query() query: ListGroupsQueryDto): Promise<GroupSummaryRecord[]> {
    return this.groups.listPublic(query.courseId);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @Get('admin/groups')
  listForStaff(
    @CurrentUser() user: AuthUser,
    @Query() query: ListGroupsQueryDto,
  ): Promise<AdminGroupRecord[]> {
    return this.groups.listForStaff(user, query.courseId);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('admin/groups/:id')
  findForAdmin(@Param('id') id: string): Promise<AdminGroupRecord> {
    return this.groups.findForAdmin(id);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @Get('groups/:id/students')
  students(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<GroupStudentRecord[]> {
    return this.groups.students(user, id);
  }

  @Public()
  @Get('groups/:id')
  findOne(@Param('id') id: string): Promise<GroupSummaryRecord> {
    return this.groups.findPublic(id);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post('courses/:id/groups')
  create(@Param('id') courseId: string, @Body() dto: CreateGroupDto): Promise<AdminGroupRecord> {
    return this.groups.create(courseId, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch('groups/:id')
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto): Promise<AdminGroupRecord> {
    return this.groups.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post('groups/:id/sessions/regenerate')
  @HttpCode(HttpStatus.OK)
  regenerate(@Param('id') id: string): Promise<AdminGroupRecord> {
    return this.groups.regenerateSessions(id);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Delete('groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.groups.remove(id);
  }
}
