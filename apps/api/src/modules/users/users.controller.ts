import type { Paginated } from '@ai-academy/shared';
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import type { PublicUserRecord } from './user.select.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<PublicUserRecord> {
    return this.users.findById(user.id);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<PublicUserRecord> {
    return this.users.updateProfile(user.id, dto);
  }

  @Roles(Role.ADMIN)
  @Get()
  list(@Query() query: ListUsersQueryDto): Promise<Paginated<PublicUserRecord>> {
    return this.users.list(query);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/role')
  updateRole(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<PublicUserRecord> {
    return this.users.updateRole(actor.id, id, dto.role);
  }

  /** Admins edit anyone's profile, e.g. an instructor's public title, bio and photo. */
  @Roles(Role.ADMIN)
  @Patch(':id/profile')
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<PublicUserRecord> {
    await this.users.findById(id);
    return this.users.updateProfile(id, dto);
  }
}
