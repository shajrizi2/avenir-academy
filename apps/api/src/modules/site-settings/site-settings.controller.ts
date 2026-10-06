import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto.js';
import { type SiteSettingsRecord, SiteSettingsService } from './site-settings.service.js';

@ApiTags('site-settings')
@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly settings: SiteSettingsService) {}

  @Public()
  @Get()
  get(): Promise<SiteSettingsRecord> {
    return this.settings.get();
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch()
  update(@Body() dto: UpdateSiteSettingsDto): Promise<SiteSettingsRecord> {
    return this.settings.update(dto);
  }
}
