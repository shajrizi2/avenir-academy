import type {
  AdminHiddenJob,
  AdminJobBlock,
  AdminJobCompany,
  AdminJobsOverview,
  MessageResponse,
} from '@ai-academy/shared';
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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { Role } from '../../../generated/prisma/enums.js';
import {
  AddJobBlockDto,
  AddJobCompanyDto,
  UpdateHiddenJobDto,
  UpdateJobCompanyDto,
} from '../dto/admin-jobs.dto.js';
import { AdminJobsService } from './admin-jobs.service.js';

@ApiTags('admin-jobs')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/jobs')
export class AdminJobsController {
  constructor(private readonly admin: AdminJobsService) {}

  @Get('overview')
  overview(): Promise<AdminJobsOverview> {
    return this.admin.overview();
  }

  @Post('run')
  @HttpCode(HttpStatus.ACCEPTED)
  run(): MessageResponse {
    this.admin.runNow();
    return { message: 'Mbledhja nisi. Rifresko ditarin pas disa minutash.' };
  }

  @Get('companies')
  companies(): Promise<AdminJobCompany[]> {
    return this.admin.companies();
  }

  @Post('companies')
  async addCompany(@Body() dto: AddJobCompanyDto): Promise<MessageResponse> {
    await this.admin.addCompany(dto.name, dto.careersUrl);
    return { message: 'Kompania u shtua. Shpalljet e saj vijnë në mbledhjen e radhës.' };
  }

  @Patch('companies/:id')
  async setCompany(
    @Param('id') id: string,
    @Body() dto: UpdateJobCompanyDto,
  ): Promise<MessageResponse> {
    await this.admin.setCompanyStatus(id, dto.status);
    return { message: 'U ruajt.' };
  }

  @Get('blocks')
  blocks(): Promise<AdminJobBlock[]> {
    return this.admin.blocks();
  }

  @Post('blocks')
  async addBlock(@Body() dto: AddJobBlockDto): Promise<MessageResponse> {
    await this.admin.addBlock(dto.kind, dto.value, dto.reason);
    return { message: 'U bllokua.' };
  }

  @Delete('blocks/:id')
  async removeBlock(@Param('id') id: string): Promise<MessageResponse> {
    await this.admin.removeBlock(id);
    return { message: 'Bllokimi u hoq.' };
  }

  @Get('hidden')
  hidden(): Promise<AdminHiddenJob[]> {
    return this.admin.hidden();
  }

  @Patch(':id')
  async setHidden(
    @Param('id') id: string,
    @Body() dto: UpdateHiddenJobDto,
  ): Promise<MessageResponse> {
    await this.admin.setHiddenJob(id, dto.status, new Date());
    return { message: 'U ruajt.' };
  }
}
