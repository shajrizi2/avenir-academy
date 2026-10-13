import {
  MEET_URL_PATTERN,
  SESSION_DEFAULT_DURATION_MIN,
  SESSION_MAX_DURATION_MIN,
  SESSION_MIN_DURATION_MIN,
  SESSION_TITLE_MAX_LENGTH,
} from '@ai-academy/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import { trim } from '../../../common/transforms.js';

export class CreateSessionDto {
  @ApiProperty({ example: 'Week 1: How LLMs work' })
  @Transform(trim)
  @IsString()
  @Length(3, SESSION_TITLE_MAX_LENGTH)
  title: string;

  @ApiProperty({ description: 'ISO-8601 UTC date-time' })
  @IsISO8601({ strict: true })
  startsAt: string;

  @ApiPropertyOptional({ default: SESSION_DEFAULT_DURATION_MIN })
  @IsOptional()
  @IsInt()
  @Min(SESSION_MIN_DURATION_MIN)
  @Max(SESSION_MAX_DURATION_MIN)
  durationMin?: number;

  @ApiProperty({ example: 'https://meet.google.com/abc-defg-hij' })
  @Transform(trim)
  @IsString()
  @Matches(MEET_URL_PATTERN, { message: 'Lidhja duhet të jetë një lidhje Google Meet' })
  meetUrl: string;

  @ApiPropertyOptional({ description: 'The cohort this lecture is for' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  groupId?: string;
}
