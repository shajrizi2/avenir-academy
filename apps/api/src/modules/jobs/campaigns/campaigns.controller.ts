import type { AdminCampaign, AdminSubscribers, MessageResponse } from '@ai-academy/shared';
import { Body, Controller, Delete, Get, Header, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../../common/auth-user.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { Role } from '../../../generated/prisma/enums.js';
import { CampaignDto } from '../dto/campaign.dto.js';
import { CampaignsService } from './campaigns.service.js';

/** The job seekers' emails and email campaigns, for admins (PLAN D37). */
@ApiTags('admin-campaigns')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get('subscribers')
  subscribers(): Promise<AdminSubscribers> {
    return this.campaigns.subscribers();
  }

  @Get('subscribers/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="email-et.csv"')
  export(): Promise<string> {
    return this.campaigns.subscribersCsv();
  }

  @Delete('subscribers/:id')
  async deleteSubscriber(@Param('id') id: string): Promise<MessageResponse> {
    await this.campaigns.deleteSubscriber(id);
    return { message: 'Email-i u fshi.' };
  }

  @Get('campaigns')
  list(): Promise<AdminCampaign[]> {
    return this.campaigns.list();
  }

  @Post('campaigns')
  create(@Body() dto: CampaignDto, @CurrentUser() user: AuthUser): Promise<AdminCampaign> {
    return this.campaigns.create(dto.subject, dto.body, user.id);
  }

  @Patch('campaigns/:id')
  update(@Param('id') id: string, @Body() dto: CampaignDto): Promise<AdminCampaign> {
    return this.campaigns.update(id, dto.subject, dto.body);
  }

  @Delete('campaigns/:id')
  async remove(@Param('id') id: string): Promise<MessageResponse> {
    await this.campaigns.remove(id);
    return { message: 'Fushata u fshi.' };
  }

  @Post('campaigns/:id/test')
  async test(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<MessageResponse> {
    await this.campaigns.sendTest(id, user.email, new Date());
    return { message: `Email-i i provës u dërgua te ${user.email}.` };
  }

  @Post('campaigns/:id/send')
  send(@Param('id') id: string): Promise<AdminCampaign> {
    return this.campaigns.start(id, new Date());
  }

  @Post('campaigns/:id/cancel')
  cancel(@Param('id') id: string): Promise<AdminCampaign> {
    return this.campaigns.cancel(id, new Date());
  }
}
