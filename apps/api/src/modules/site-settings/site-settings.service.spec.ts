import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { EMPTY_SETTINGS, SiteSettingsService } from './site-settings.service.js';

describe('SiteSettingsService', () => {
  let prisma: { siteSettings: Record<'findUnique' | 'upsert', ReturnType<typeof vi.fn>> };
  let service: SiteSettingsService;

  beforeEach(() => {
    prisma = { siteSettings: { findUnique: vi.fn(), upsert: vi.fn() } };
    service = new SiteSettingsService(prisma as unknown as PrismaService);
  });

  it('returns empty defaults before anything is saved', async () => {
    prisma.siteSettings.findUnique.mockResolvedValue(null);
    await expect(service.get()).resolves.toEqual(EMPTY_SETTINGS);
  });

  it('upserts the singleton row and converts the cohort date', async () => {
    prisma.siteSettings.upsert.mockResolvedValue(EMPTY_SETTINGS);
    await service.update({ nextCohortStart: '2026-11-02T18:00:00.000Z', seatsTotal: 18 });

    const args = prisma.siteSettings.upsert.mock.calls[0][0] as {
      where: { id: number };
      update: { nextCohortStart: Date; seatsTotal: number };
    };
    expect(args.where).toEqual({ id: 1 });
    expect(args.update.nextCohortStart).toEqual(new Date('2026-11-02T18:00:00.000Z'));
    expect(args.update.seatsTotal).toBe(18);
  });

  it('clears the cohort date with null and leaves it alone when omitted', async () => {
    prisma.siteSettings.upsert.mockResolvedValue(EMPTY_SETTINGS);
    await service.update({ nextCohortStart: null });
    await service.update({ contactEmail: 'hello@example.com' });

    const [cleared, untouched] = prisma.siteSettings.upsert.mock.calls.map(
      (call) => (call[0] as { update: Record<string, unknown> }).update,
    );
    expect(cleared.nextCohortStart).toBeNull();
    expect(untouched.nextCohortStart).toBeUndefined();
  });
});
