import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class AddJobCompanyDto {
  @ApiProperty({ example: 'Acme Labs' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'https://jobs.lever.co/acme' })
  @IsUrl({ require_protocol: true }, { message: 'Ngjit lidhjen e faqes së karrierës' })
  careersUrl: string;
}

export class UpdateJobCompanyDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'DISABLED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'DISABLED'])
  status?: 'ACTIVE' | 'DISABLED';

  /** Whether the company hires people in Kosovo (PLAN D40). */
  @ApiPropertyOptional({ enum: ['YES', 'NO', 'UNKNOWN'] })
  @IsOptional()
  @IsIn(['YES', 'NO', 'UNKNOWN'])
  kosovo?: 'YES' | 'NO' | 'UNKNOWN';
}

export class AddJobBlockDto {
  @ApiProperty({ enum: ['COMPANY', 'DOMAIN'] })
  @IsIn(['COMPANY', 'DOMAIN'])
  kind: 'COMPANY' | 'DOMAIN';

  @ApiProperty({ example: 'quickcash.example' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  value: string;

  @ApiProperty({ example: 'Kërkon pagesë për aplikim' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  reason: string;
}

export class UpdateHiddenJobDto {
  @ApiProperty({
    enum: ['OPEN', 'CLOSED'],
    description: 'OPEN puts a hidden job back on the board',
  })
  @IsIn(['OPEN', 'CLOSED'])
  status: 'OPEN' | 'CLOSED';
}
