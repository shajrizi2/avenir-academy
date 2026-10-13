import {
  LESSON_CONTENT_MAX_LENGTH,
  LESSON_MAX_MINUTES,
  LESSON_TITLE_MAX_LENGTH,
  VIDEO_URL_PATTERN,
} from '@ai-academy/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
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

export class CreateLessonDto {
  @ApiProperty({ example: 'Si funksionojnë modelet gjuhësore' })
  @Transform(trim)
  @IsString()
  @Length(2, LESSON_TITLE_MAX_LENGTH)
  title: string;

  @ApiProperty({ description: 'Markdown' })
  @Transform(trim)
  @IsString()
  @Length(1, LESSON_CONTENT_MAX_LENGTH)
  content: string;

  @ApiPropertyOptional({ nullable: true, example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @Matches(VIDEO_URL_PATTERN, { message: 'Lidhja e videos duhet të jetë nga YouTube ose Vimeo' })
  videoUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(LESSON_MAX_MINUTES)
  estimatedMin?: number | null;
}
