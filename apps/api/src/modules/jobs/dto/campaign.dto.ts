import { CAMPAIGN_BODY_MAX, CAMPAIGN_SUBJECT_MAX } from '@ai-academy/shared';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CampaignDto {
  @ApiProperty({ example: 'Punë të reja remote këtë javë' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(CAMPAIGN_SUBJECT_MAX)
  subject: string;

  @ApiProperty({ description: 'Plain text; an empty line starts a new paragraph' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(CAMPAIGN_BODY_MAX)
  body: string;
}
