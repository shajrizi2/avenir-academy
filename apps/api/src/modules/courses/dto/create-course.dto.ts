import { MAX_PRICE_CENTS, SLUG_PATTERN } from '@ai-academy/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { emptyToNull, trim } from '../../../common/transforms.js';

export class CreateCourseDto {
  @ApiProperty({ example: 'ai-foundations' })
  @Transform(trim)
  @IsString()
  @Length(3, 80)
  @Matches(SLUG_PATTERN, {
    message: 'Adresa (slug) mund të ketë vetëm shkronja të vogla, numra dhe viza',
  })
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

  @ApiPropertyOptional({ description: 'Albanian title; empty or null = not translated' })
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @Length(3, 120)
  titleSq?: string | null;

  @ApiPropertyOptional({ description: 'Albanian summary' })
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @Length(10, 300)
  summarySq?: string | null;

  @ApiPropertyOptional({ description: 'Albanian description' })
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @Length(10, 10_000)
  descriptionSq?: string | null;

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

  @ApiPropertyOptional({ description: 'Per month (= per module), in cents', example: 8900 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_CENTS)
  priceCents?: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Struck-through standard price in cents; null = none',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_CENTS)
  listPriceCents?: number | null;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @Transform(trim)
  @Matches(/^[A-Z]{3}$/, { message: 'Monedha duhet të jetë një kod ISO 4217, p.sh. EUR' })
  currency?: string;
}
