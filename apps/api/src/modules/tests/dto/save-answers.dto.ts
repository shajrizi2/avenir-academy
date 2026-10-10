import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

/** The service checks every question and option id against the test (see cleanAnswers). */
export class SaveAnswersDto {
  @ApiProperty({
    description: 'Question id → chosen option ids',
    example: { cmquestion1: ['cmoption1'] },
  })
  @IsObject()
  answers: Record<string, string[]>;
}

export class SubmitAttemptDto {
  @ApiPropertyOptional({ description: 'A final save before grading' })
  @IsOptional()
  @IsObject()
  answers?: Record<string, string[]>;
}
