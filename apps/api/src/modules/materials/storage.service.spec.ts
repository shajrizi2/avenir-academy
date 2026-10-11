import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { LocalStorageService, S3StorageService } from './storage.service.js';

/** A fake S3 bucket: PutObject/GetObject/DeleteObject against a Map. */
const bucket = new Map<string, Buffer>();
vi.mock('@aws-sdk/client-s3', async () => {
  const { Readable } = await import('node:stream');
  class Command {
    constructor(readonly input: { Bucket: string; Key: string; Body?: Buffer }) {}
  }
  class NoSuchKey extends Error {}
  return {
    PutObjectCommand: class PutObjectCommand extends Command {},
    GetObjectCommand: class GetObjectCommand extends Command {},
    DeleteObjectCommand: class DeleteObjectCommand extends Command {},
    NoSuchKey,
    S3Client: class {
      send(command: Command) {
        const { Key, Body } = command.input;
        switch (command.constructor.name) {
          case 'PutObjectCommand':
            bucket.set(Key, Body!);
            return Promise.resolve({});
          case 'DeleteObjectCommand':
            bucket.delete(Key);
            return Promise.resolve({});
          default: {
            const data = bucket.get(Key);
            if (!data) return Promise.reject(new NoSuchKey());
            return Promise.resolve({ Body: Readable.from(data), ContentLength: data.length });
          }
        }
      }
    },
  };
});

function configWith(values: Partial<EnvironmentVariables>) {
  return {
    get: (key: keyof EnvironmentVariables) => values[key],
  } as unknown as ConfigService<EnvironmentVariables, true>;
}

async function text(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString();
}

describe('LocalStorageService', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'storage-spec-'));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('saves, opens and removes a file', async () => {
    const storage = new LocalStorageService(configWith({ UPLOAD_DIR: dir }));
    const key = await storage.save(Buffer.from('hello'), 'PDF');
    expect(key).toMatch(/^[0-9a-f-]{36}\.pdf$/);

    const file = await storage.open(key);
    expect(file.size).toBe(5);
    expect(await text(file.stream)).toBe('hello');

    await storage.remove(key);
    await expect(storage.open(key)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects keys it did not generate (no path traversal)', async () => {
    const storage = new LocalStorageService(configWith({ UPLOAD_DIR: dir }));
    await expect(storage.open('../../etc/passwd')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('S3StorageService', () => {
  beforeEach(() => bucket.clear());

  it('stores objects under the prefix and streams them back', async () => {
    const storage = new S3StorageService(
      configWith({ S3_BUCKET: 'materials', S3_PREFIX: 'files/', S3_REGION: 'auto' }),
    );
    const key = await storage.save(Buffer.from('slides'), 'pptx');
    expect([...bucket.keys()]).toEqual([`files/${key}`]);

    const file = await storage.open(key);
    expect(file.size).toBe(6);
    expect(await text(file.stream)).toBe('slides');

    await storage.remove(key);
    expect(bucket.size).toBe(0);
    await expect(storage.open(key)).rejects.toBeInstanceOf(NotFoundException);
  });
});
