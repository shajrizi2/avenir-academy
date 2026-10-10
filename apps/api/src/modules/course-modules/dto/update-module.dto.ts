import { PartialType } from '@nestjs/swagger';
import { CreateModuleDto } from './create-module.dto.js';

/** The order of a module is fixed once created: progression depends on it. */
export class UpdateModuleDto extends PartialType(CreateModuleDto) {}
