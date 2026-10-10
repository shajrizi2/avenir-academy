import { PartialType } from '@nestjs/swagger';
import { CreateTestDto } from './create-test.dto.js';

export class UpdateTestDto extends PartialType(CreateTestDto) {}
