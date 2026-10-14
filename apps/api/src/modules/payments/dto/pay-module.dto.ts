import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums.js';

/** Student: pay a later month of an existing enrollment. */
export class PayModuleDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  moduleId: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  provider: PaymentMethod;
}
