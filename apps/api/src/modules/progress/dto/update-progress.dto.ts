import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ModuleStatus } from '../../../generated/prisma/enums.js';

export class UpdateProgressDto {
  @ApiProperty({
    enum: [ModuleStatus.ACTIVE, ModuleStatus.PASSED],
    description: 'ACTIVE unlocks the module or resets its attempts; PASSED passes it by hand',
  })
  @IsIn([ModuleStatus.ACTIVE, ModuleStatus.PASSED])
  status: typeof ModuleStatus.ACTIVE | typeof ModuleStatus.PASSED;
}
