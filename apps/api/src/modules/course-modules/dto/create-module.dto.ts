import {
  MODULE_DEFAULT_DURATION_WEEKS,
  MODULE_DESCRIPTION_MAX_LENGTH,
  MODULE_MAX_DURATION_WEEKS,
  MODULE_TITLE_MAX_LENGTH,
} from '@ai-academy/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min, ValidateIf } from 'class-validator';
import { emptyToNull, trim } from '../../../common/transforms.js';

export class CreateModuleDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(3, MODULE_TITLE_MAX_LENGTH)
  title: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(10, MODULE_DESCRIPTION_MAX_LENGTH)
  description: string;

  @ApiPropertyOptional({ default: MODULE_DEFAULT_DURATION_WEEKS })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MODULE_MAX_DURATION_WEEKS)
  durationWeeks?: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'A user with role INSTRUCTOR; null or "" for none',
  })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  instructorId?: string | null;
}
