import type { Paginated } from '@ai-academy/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { EmailStatus, EmailType, Role } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export class ListEmailsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EmailType })
  @IsOptional()
  @IsEnum(EmailType)
  type?: EmailType;

  @ApiPropertyOptional({ enum: EmailStatus })
  @IsOptional()
  @IsEnum(EmailStatus)
  status?: EmailStatus;
}

const emailLogSelect = {
  id: true,
  to: true,
  type: true,
  subject: true,
  status: true,
  error: true,
  createdAt: true,
  sentAt: true,
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
} as const satisfies Prisma.EmailLogSelect;

export type EmailLogRecord = Prisma.EmailLogGetPayload<{ select: typeof emailLogSelect }>;

/** The admin's view of every email the platform sent. */
@ApiTags('emails')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/emails')
export class EmailLogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: ListEmailsQueryDto): Promise<Paginated<EmailLogRecord>> {
    const where: Prisma.EmailLogWhereInput = { type: query.type, status: query.status };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: emailLogSelect,
      }),
      this.prisma.emailLog.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
}
