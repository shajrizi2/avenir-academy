import { MaterialKind } from '@ai-academy/shared';
import type { Prisma } from '../../generated/prisma/client.js';

export const materialSelect = {
  id: true,
  title: true,
  kind: true,
  url: true,
} as const satisfies Prisma.MaterialSelect;

type MaterialRow = Prisma.MaterialGetPayload<{ select: typeof materialSelect }>;

export interface MaterialView {
  id: string;
  title: string;
  kind: MaterialKind;
  url: string | null;
  fileType: string | null;
}

/** Uploaded files are stored as `file:<storage key>` in Material.url; the key never leaves the API. */
export const FILE_URL_PREFIX = 'file:';

export function storageKeyOf(material: Pick<MaterialRow, 'url'>): string | null {
  return material.url.startsWith(FILE_URL_PREFIX)
    ? material.url.slice(FILE_URL_PREFIX.length)
    : null;
}

export function toMaterialView(material: MaterialRow): MaterialView {
  const key = storageKeyOf(material);
  if (key) {
    return {
      id: material.id,
      title: material.title,
      kind: MaterialKind.FILE,
      url: null,
      fileType: key.split('.').pop() ?? null,
    };
  }
  return {
    id: material.id,
    title: material.title,
    kind: MaterialKind.LINK,
    url: material.url,
    fileType: null,
  };
}
