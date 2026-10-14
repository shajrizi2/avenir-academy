import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UpdateSiteSettingsDto } from './dto/update-site-settings.dto.js';

/** The settings table holds a single row with this id. */
const SETTINGS_ID = 1;

const settingsSelect = {
  nextCohortStart: true,
  scheduleSq: true,
  scheduleEn: true,
  seatsTotal: true,
  priceAmount: true,
  priceCurrency: true,
  priceNoteSq: true,
  priceNoteEn: true,
  contactEmail: true,
  contactPhone: true,
  whatsappNumber: true,
  stripeEnabled: true,
  bankTransferEnabled: true,
  bankBeneficiary: true,
  bankIban: true,
  bankName: true,
  bankSwift: true,
} as const satisfies Prisma.SiteSettingsSelect;

export type SiteSettingsRecord = Prisma.SiteSettingsGetPayload<{ select: typeof settingsSelect }>;

/** Used until an admin saves settings for the first time. */
export const EMPTY_SETTINGS: SiteSettingsRecord = {
  nextCohortStart: null,
  scheduleSq: null,
  scheduleEn: null,
  seatsTotal: null,
  priceAmount: null,
  priceCurrency: 'EUR',
  priceNoteSq: null,
  priceNoteEn: null,
  contactEmail: null,
  contactPhone: null,
  whatsappNumber: null,
  stripeEnabled: true,
  bankTransferEnabled: true,
  bankBeneficiary: null,
  bankIban: null,
  bankName: null,
  bankSwift: null,
};

@Injectable()
export class SiteSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SiteSettingsRecord> {
    const settings = await this.prisma.siteSettings.findUnique({
      where: { id: SETTINGS_ID },
      select: settingsSelect,
    });
    return settings ?? EMPTY_SETTINGS;
  }

  update(dto: UpdateSiteSettingsDto): Promise<SiteSettingsRecord> {
    const data = {
      ...dto,
      nextCohortStart:
        dto.nextCohortStart === undefined
          ? undefined
          : dto.nextCohortStart && new Date(dto.nextCohortStart),
    };
    return this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
      select: settingsSelect,
    });
  }
}
