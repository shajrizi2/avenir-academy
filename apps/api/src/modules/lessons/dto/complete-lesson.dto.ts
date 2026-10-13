import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CompleteLessonDto {
  @ApiPropertyOptional({ default: true, description: 'false removes the mark' })
  @IsOptional()
  @IsBoolean()
  done?: boolean;
}
