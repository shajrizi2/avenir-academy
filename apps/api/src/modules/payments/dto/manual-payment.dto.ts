import { ENROLLMENT_NOTE_MAX_LENGTH } from '@ai-academy/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { emptyToNull } from '../../../common/transforms.js';

/** Admin: record a payment received outside the platform as confirmed. */
export class ManualPaymentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  enrollmentId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  moduleId: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(ENROLLMENT_NOTE_MAX_LENGTH)
  note?: string | null;
}
