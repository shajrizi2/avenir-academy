import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { emptyToNull } from '../../../common/transforms.js';

/** Every field is optional; send null (or "") to clear a value. */
export class UpdateSiteSettingsDto {
  @ApiPropertyOptional({ nullable: true, description: 'ISO-8601 UTC date-time' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsISO8601({ strict: true })
  nextCohortStart?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2 mbrëmje në javë, 19:00–20:30' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(120)
  scheduleSq?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2 evenings a week, 19:00–20:30' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(120)
  scheduleEn?: string | null;

  @ApiPropertyOptional({ nullable: true, minimum: 1 })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(1000)
  seatsTotal?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Whole units; null shows "contact us"' })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  priceAmount?: number | null;

  @ApiPropertyOptional({ example: 'EUR', description: 'ISO 4217 code' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, { message: 'priceCurrency must be an ISO 4217 code such as EUR' })
  priceCurrency?: string;

  @ApiPropertyOptional({ nullable: true, example: 'për modul' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(120)
  priceNoteSq?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'per module' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(120)
  priceNoteEn?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsEmail()
  contactEmail?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '+383 44 000 000' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @Matches(/^\+?[0-9 ()-]{6,30}$/, { message: 'contactPhone must be a valid phone number' })
  contactPhone?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '38344000000', description: 'Digits only' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @Matches(/^[1-9][0-9]{6,14}$/, {
    message: 'whatsappNumber must be digits in international format, without + or spaces',
  })
  whatsappNumber?: string | null;
}
