import { ENROLLMENT_NOTE_MAX_LENGTH } from '@ai-academy/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { emptyToNull } from '../../../common/transforms.js';

/** Admin: confirm, reject or refund with an optional internal note. */
export class PaymentNoteDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(ENROLLMENT_NOTE_MAX_LENGTH)
  note?: string | null;
}
