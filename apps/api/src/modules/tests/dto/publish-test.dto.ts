import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class PublishTestDto {
  @ApiProperty()
  @IsBoolean()
  isPublished: boolean;
}
