import { MATERIAL_MAX_BYTES } from '@ai-academy/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthUser } from '../../common/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { CreateMaterialDto } from './dto/create-material.dto.js';
import type { MaterialView } from './material.view.js';
import { MaterialsService, type UploadedMaterialFile } from './materials.service.js';

@ApiTags('materials')
@ApiBearerAuth()
@Controller()
export class MaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  /** A link (JSON) or an uploaded file (multipart, field `file`, max 20 MB). */
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post('modules/:id/materials')
  @ApiConsumes('application/json', 'multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MATERIAL_MAX_BYTES, files: 1, fields: 4 } }),
  )
  create(
    @CurrentUser() user: AuthUser,
    @Param('id') moduleId: string,
    @Body() dto: CreateMaterialDto,
    @UploadedFile() file?: UploadedMaterialFile,
  ): Promise<MaterialView> {
    return this.materials.create(user, moduleId, dto, file);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Delete('materials/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.materials.remove(user, id);
  }

  @Get('materials/:id/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.materials.download(user, id);
    // Always a download, never rendered inline by the browser.
    res.attachment(file.fileName);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(file.stream, { type: file.contentType, length: file.size });
  }
}
