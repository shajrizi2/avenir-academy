import {
  OPTION_TEXT_MAX_LENGTH,
  QUESTION_MAX_OPTIONS,
  QUESTION_MAX_POINTS,
  QUESTION_MIN_OPTIONS,
  QUESTION_TEXT_MAX_LENGTH,
  TEST_MAX_QUESTIONS,
} from '@ai-academy/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { trim } from '../../../common/transforms.js';
import { QuestionType } from '../../../generated/prisma/enums.js';

export class OptionDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(1, OPTION_TEXT_MAX_LENGTH)
  text: string;

  @ApiProperty()
  @IsBoolean()
  isCorrect: boolean;
}

export class QuestionDto {
  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(3, QUESTION_TEXT_MAX_LENGTH)
  text: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(QUESTION_MAX_POINTS)
  points?: number;

  @ApiProperty({ type: [OptionDto] })
  @IsArray()
  @ArrayMinSize(QUESTION_MIN_OPTIONS)
  @ArrayMaxSize(QUESTION_MAX_OPTIONS)
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options: OptionDto[];
}

/** Replaces every question of a test, in the given order. */
export class ReplaceQuestionsDto {
  @ApiProperty({ type: [QuestionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(TEST_MAX_QUESTIONS)
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];
}
