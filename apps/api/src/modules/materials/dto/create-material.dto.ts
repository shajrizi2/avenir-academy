import { MATERIAL_TITLE_MAX_LENGTH, URL_MAX_LENGTH } from '@ai-academy/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, Length, MaxLength } from 'class-validator';
import { trim } from '../../../common/transforms.js';

/** Send JSON `{ title, url }` for a link, or multipart `title` + `file` for an upload. */
export class CreateMaterialDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(2, MATERIAL_TITLE_MAX_LENGTH)
  title: string;

  @ApiPropertyOptional({ description: 'Required unless a file is uploaded' })
  @IsOptional()
  @Transform(trim)
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  @MaxLength(URL_MAX_LENGTH)
  url?: string;
}
