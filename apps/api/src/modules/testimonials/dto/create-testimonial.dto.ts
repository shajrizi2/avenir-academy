import {
  NAME_MAX_LENGTH,
  TESTIMONIAL_QUOTE_MAX_LENGTH,
  TESTIMONIAL_ROLE_MAX_LENGTH,
  URL_MAX_LENGTH,
} from '@ai-academy/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { emptyToNull, trim } from '../../../common/transforms.js';
import { Locale } from '../../../generated/prisma/enums.js';

/** A real student's quote, entered by an admin with the student's permission. */
export class CreateTestimonialDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(2, NAME_MAX_LENGTH * 2)
  name: string;

  @ApiPropertyOptional({ nullable: true, example: 'Marketing manager' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(TESTIMONIAL_ROLE_MAX_LENGTH)
  role?: string | null;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(10, TESTIMONIAL_QUOTE_MAX_LENGTH)
  quote: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  @MaxLength(URL_MAX_LENGTH)
  avatarUrl?: string | null;

  @ApiProperty({ enum: Locale })
  @IsEnum(Locale)
  locale: Locale;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
