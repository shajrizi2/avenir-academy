import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@ai-academy/shared';
import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token from the reset email link' })
  @IsJWT()
  token: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(/[A-Za-z]/, { message: 'password must include at least one letter' })
  @Matches(/[0-9]/, { message: 'password must include at least one number' })
  password: string;
}
