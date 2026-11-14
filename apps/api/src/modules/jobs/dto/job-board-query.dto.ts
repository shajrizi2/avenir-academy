import { JOB_CATEGORIES, JOB_SEARCH_MAX_LENGTH, type JobCategory } from '@ai-academy/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class JobBoardQueryDto {
  @ApiPropertyOptional({ description: 'Words to find in the title or company name' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString()
  @MaxLength(JOB_SEARCH_MAX_LENGTH)
  q?: string;

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
