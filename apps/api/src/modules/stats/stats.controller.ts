import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { type AdminStatsRecord, StatsService } from './stats.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  overview(): Promise<AdminStatsRecord> {
    return this.stats.overview();
  }
}
