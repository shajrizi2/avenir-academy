import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Locale } from '../../../generated/prisma/enums.js';

export class ListTestimonialsQueryDto {
  @ApiPropertyOptional({ enum: Locale })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;

  @ApiPropertyOptional({ description: 'Admins only: include unpublished testimonials' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  all?: boolean;
}
