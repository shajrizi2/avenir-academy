import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsString, ValidateNested } from 'class-validator';

export class AttendanceEntryDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsBoolean()
  present: boolean;
}

export class SaveAttendanceDto {
  @ApiProperty({ type: [AttendanceEntryDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  records: AttendanceEntryDto[];
}
