import { ENROLLMENT_NOTE_MAX_LENGTH } from '@ai-academy/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { emptyToNull } from '../../../common/transforms.js';
import { EnrollmentStatus } from '../../../generated/prisma/enums.js';

export class DecideEnrollmentDto {
  @ApiProperty({ enum: [EnrollmentStatus.APPROVED, EnrollmentStatus.REJECTED] })
  @IsIn([EnrollmentStatus.APPROVED, EnrollmentStatus.REJECTED])
  status: typeof EnrollmentStatus.APPROVED | typeof EnrollmentStatus.REJECTED;

  @ApiPropertyOptional({ nullable: true, description: 'Internal note for the team' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(ENROLLMENT_NOTE_MAX_LENGTH)
  note?: string | null;
}
