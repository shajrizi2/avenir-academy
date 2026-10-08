import { extname } from 'node:path';
import type { ReadStream } from 'node:fs';
import { MATERIAL_FILE_EXTENSIONS } from '@ai-academy/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth-user.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ModuleAccessService } from '../course-modules/module-access.service.js';
import type { CreateMaterialDto } from './dto/create-material.dto.js';
import {
  FILE_URL_PREFIX,
  materialSelect,
  type MaterialView,
  storageKeyOf,
  toMaterialView,
} from './material.view.js';
import { StorageService } from './storage.service.js';

export interface UploadedMaterialFile {
  originalname: string;
  size: number;
  buffer: Buffer;
}

export interface MaterialDownload {
  stream: ReadStream;
  size: number;
  fileName: string;
  contentType: string;
}

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  zip: 'application/zip',
  ipynb: 'application/x-ipynb+json',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

const ALLOWED = new Set<string>(MATERIAL_FILE_EXTENSIONS);

@Injectable()
export class MaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ModuleAccessService,
    private readonly storage: StorageService,
  ) {}

  async create(
    user: AuthUser,
    moduleId: string,
    dto: CreateMaterialDto,
    file?: UploadedMaterialFile,
  ): Promise<MaterialView> {
    await this.access.assertStaff(user, moduleId);
    if (file && dto.url) throw new BadRequestException('Send either a file or a url, not both');
    if (!file && !dto.url) throw new BadRequestException('Add a link or choose a file to upload');

    let url = dto.url ?? '';
    if (file) {
      const extension = extname(file.originalname).slice(1).toLowerCase();
      if (!ALLOWED.has(extension)) {
        throw new BadRequestException(
          `Unsupported file type. Allowed: ${MATERIAL_FILE_EXTENSIONS.join(', ')}`,
        );
      }
      if (file.size === 0) throw new BadRequestException('The file is empty');
      url = FILE_URL_PREFIX + (await this.storage.save(file.buffer, extension));
    }

    try {
      const material = await this.prisma.material.create({
        data: { moduleId, title: dto.title, url, kind: file ? 'FILE' : 'LINK' },
        select: materialSelect,
      });
      return toMaterialView(material);
    } catch (error) {
      const key = storageKeyOf({ url });
      if (key) await this.storage.remove(key);
      throw error;
    }
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const material = await this.find(id);
    await this.access.assertStaff(user, material.moduleId);
    await this.prisma.material.delete({ where: { id } });
    const key = storageKeyOf(material);
    if (key) await this.storage.remove(key);
  }

  /** Same access as the module page: enrolled students of an unlocked module, or staff. */
  async download(user: AuthUser, id: string): Promise<MaterialDownload> {
    const material = await this.find(id);
    await this.access.assertCanView(user, material.moduleId);
    const key = storageKeyOf(material);
    if (!key) throw new BadRequestException('This material is a link, not a file');
    const extension = key.split('.').pop() ?? '';
    const { stream, size } = await this.storage.open(key);
    return {
      stream,
      size,
      fileName: `${material.title}.${extension}`,
      contentType: CONTENT_TYPES[extension] ?? 'application/octet-stream',
    };
  }

  private async find(id: string) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      select: { ...materialSelect, moduleId: true },
    });
    if (!material) throw new NotFoundException('Material not found');
    return material;
  }
}
