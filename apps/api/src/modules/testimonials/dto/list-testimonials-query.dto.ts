import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Locale } from '../../../generated/prisma/enums.js';

export class ListTestimonialsQueryDto {
  @ApiPropertyOptional({ enum: Locale })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;
}
