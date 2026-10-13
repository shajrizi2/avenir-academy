import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums.js';

/** Student: pay the first month of a group (the seat is held meanwhile). */
export class CheckoutDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  groupId: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  provider: PaymentMethod;
}
