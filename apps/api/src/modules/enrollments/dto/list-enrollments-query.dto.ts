import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { EnrollmentStatus } from '../../../generated/prisma/enums.js';

export class ListEnrollmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EnrollmentStatus })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string;
}
