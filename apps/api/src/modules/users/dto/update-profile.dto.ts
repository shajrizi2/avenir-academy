import {
  BIO_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PHONE_PATTERN,
  TITLE_MAX_LENGTH,
  URL_MAX_LENGTH,
} from '@ai-academy/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { emptyToNull, trim } from '../../../common/transforms.js';

export class UpdateProfileDto {
  @ApiPropertyOptional({ maxLength: NAME_MAX_LENGTH })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  firstName?: string;

  @ApiPropertyOptional({ maxLength: NAME_MAX_LENGTH })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  lastName?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Empty string or null clears the phone' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === ''
      ? null
      : typeof value === 'string'
        ? value.trim()
        : value,
  )
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'Numri i telefonit nuk është i vlefshëm' })
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: TITLE_MAX_LENGTH, example: 'AI engineer' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(TITLE_MAX_LENGTH)
  title?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: BIO_MAX_LENGTH })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(BIO_MAX_LENGTH)
  bio?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Public photo URL (https)' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  @MaxLength(URL_MAX_LENGTH)
  avatarUrl?: string | null;

  @ApiPropertyOptional({ description: 'Receive the offline-learning emails (students)' })
  @IsOptional()
  @IsBoolean()
  offlineEmailsEnabled?: boolean;
}
