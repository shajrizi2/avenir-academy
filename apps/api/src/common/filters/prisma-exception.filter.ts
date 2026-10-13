import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

const STATUS_BY_CODE: Record<string, { status: HttpStatus; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: 'Ekziston tashmë një e dhënë me këtë vlerë' },
  P2003: {
    status: HttpStatus.CONFLICT,
    message: 'Kjo e dhënë përdoret ende nga të dhëna të tjera',
  },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'E dhëna nuk u gjet' },
};

/** Maps well-known Prisma errors to HTTP responses; anything else becomes a 500. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const mapped = STATUS_BY_CODE[exception.code];
    if (!mapped) {
      this.logger.error(exception.message, exception.stack);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Gabim i brendshëm i serverit',
      });
      return;
    }
    res.status(mapped.status).json({
      statusCode: mapped.status,
      message: mapped.message,
      error: HttpStatus[mapped.status],
    });
  }
}
