import {
  DEFAULT_TIMEZONE,
  GROUP_DEFAULT_CAPACITY,
  GROUP_MAX_CAPACITY,
  GROUP_NAME_MAX_LENGTH,
  LECTURE_DURATION_MIN,
  MEET_URL_PATTERN,
  SESSION_MAX_DURATION_MIN,
  SESSION_MIN_DURATION_MIN,
  TIME_PATTERN,
} from '@ai-academy/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { emptyToNull, trim } from '../../../common/transforms.js';
import { GroupStatus } from '../../../generated/prisma/enums.js';

export class CreateGroupDto {
  @ApiProperty({ example: 'Grupi 1 – Nëntor 2026' })
  @Transform(trim)
  @IsString()
  @Length(2, GROUP_NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({ example: '2026-11-01', description: 'A calendar day in the group’s time zone' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data e fillimit duhet të jetë si 2026-11-01' })
  startDate: string;

  @ApiProperty({ example: [1, 3, 5], description: '0 = Sunday … 6 = Saturday' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays: number[];

  @ApiProperty({ example: '19:00' })
  @IsString()
  @Matches(TIME_PATTERN, { message: 'Ora e fillimit duhet të jetë si 19:00' })
  startTime: string;

  @ApiPropertyOptional({ default: LECTURE_DURATION_MIN })
  @IsOptional()
  @IsInt()
  @Min(SESSION_MIN_DURATION_MIN)
  @Max(SESSION_MAX_DURATION_MIN)
  durationMin: number = LECTURE_DURATION_MIN;

  @ApiPropertyOptional({ default: DEFAULT_TIMEZONE })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z_]+\/[A-Za-z_]+$/)
  timezone: string = DEFAULT_TIMEZONE;

  @ApiPropertyOptional({ default: GROUP_DEFAULT_CAPACITY, maximum: GROUP_MAX_CAPACITY })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(GROUP_MAX_CAPACITY, { message: `Një grup ka më së shumti ${GROUP_MAX_CAPACITY} vende` })
  capacity: number = GROUP_DEFAULT_CAPACITY;

  @ApiPropertyOptional({ enum: GroupStatus })
  @IsOptional()
  @IsEnum(GroupStatus)
  status?: GroupStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  instructorId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'https://meet.google.com/abc-defg-hij' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @Matches(MEET_URL_PATTERN, { message: 'Lidhja e Google Meet nuk është e vlefshme' })
  meetUrl?: string | null;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5, 6] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  offlineEmailDays?: number[];
}
