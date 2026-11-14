import { JOB_CATEGORIES, type JobCategory } from '@ai-academy/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class JobBoardQueryDto {
  @ApiPropertyOptional({ enum: JOB_CATEGORIES })
  @IsOptional()
  @IsIn(JOB_CATEGORIES)
  category?: JobCategory;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page?: number;
}
