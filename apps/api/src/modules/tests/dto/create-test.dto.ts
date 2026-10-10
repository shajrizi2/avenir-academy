import {
  TEST_DEFAULTS,
  TEST_MAX_ATTEMPTS,
  TEST_MAX_TIME_LIMIT_MIN,
  TEST_MIN_TIME_LIMIT_MIN,
  TEST_TITLE_MAX_LENGTH,
} from '@ai-academy/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { trim } from '../../../common/transforms.js';

export class CreateTestDto {
  @ApiProperty({ example: 'AI Basics: Module Test' })
  @Transform(trim)
  @IsString()
  @Length(3, TEST_TITLE_MAX_LENGTH)
  title: string;

  @ApiPropertyOptional({ default: TEST_DEFAULTS.passMark, description: 'Percent needed to pass' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  passMark?: number;

  @ApiPropertyOptional({ default: TEST_DEFAULTS.timeLimitMin })
  @IsOptional()
  @IsInt()
  @Min(TEST_MIN_TIME_LIMIT_MIN)
  @Max(TEST_MAX_TIME_LIMIT_MIN)
  timeLimitMin?: number;

  @ApiPropertyOptional({ default: TEST_DEFAULTS.maxAttempts })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(TEST_MAX_ATTEMPTS)
  maxAttempts?: number;

  @ApiPropertyOptional({ description: 'ISO-8601 UTC. Defaults to the module’s last week.' })
  @IsOptional()
  @IsISO8601({ strict: true })
  opensAt?: string;

  @ApiPropertyOptional({ description: 'ISO-8601 UTC. Defaults to the module’s last day.' })
  @IsOptional()
  @IsISO8601({ strict: true })
  closesAt?: string;
}
