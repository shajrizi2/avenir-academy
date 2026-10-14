import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class MoveEnrollmentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  groupId: string;
}
