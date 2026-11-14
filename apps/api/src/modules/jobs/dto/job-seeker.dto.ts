import {
  JOB_CODE_LENGTH,
  JOB_REPORT_REASONS,
  type JobReportReason,
  EMAIL_MAX_LENGTH,
} from '@ai-academy/shared';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, Matches, MaxLength } from 'class-validator';
import { normalizeEmail } from '../../../common/transforms.js';

export class RequestCodeDto {
  @ApiProperty({ example: 'emri@gmail.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email: string;
}

export class VerifyCodeDto extends RequestCodeDto {
  @ApiProperty({ example: '123456' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(new RegExp(`^\\d{${JOB_CODE_LENGTH}}$`), { message: 'Kodi ka 6 shifra' })
  code: string;
}

export class ReportJobDto {
  @ApiProperty({ enum: JOB_REPORT_REASONS })
  @IsIn(JOB_REPORT_REASONS)
  reason: JobReportReason;
}
