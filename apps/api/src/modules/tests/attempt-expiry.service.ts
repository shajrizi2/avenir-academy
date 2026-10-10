import { Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { AttemptsService } from './attempts.service.js';

const SWEEP_MS = 60_000;

/**
 * Grades attempts the student abandoned once their time is up, so the module's status is
 * right even if they never come back. Reads of attempts and results also expire on demand.
 */
@Injectable()
export class AttemptExpiryService implements OnApplicationBootstrap, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly attempts: AttemptsService) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.attempts.expireOverdue(), SWEEP_MS);
    // Never keep the process alive just for this timer.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }
}
