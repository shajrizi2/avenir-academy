import { SLUG_PATTERN } from '@ai-academy/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { trim } from '../../../common/transforms.js';

export class CreateCourseDto {
  @ApiProperty({ example: 'ai-foundations' })
  @Transform(trim)
  @IsString()
  @Length(3, 80)
  @Matches(SLUG_PATTERN, { message: 'slug may contain lowercase letters, numbers and dashes' })
  slug: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(3, 120)
  title: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(10, 300)
  summary: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(10, 10_000)
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  @MaxLength(500)
  coverUrl?: string;

  @ApiPropertyOptional({ description: 'ISO-8601 UTC date-time' })
  @IsOptional()
  @IsISO8601({ strict: true })
  startDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
