import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { uuidv7 } from 'uuidv7';

const MAX_CORRELATION_ID_LENGTH = 64;
const SAFE_CORRELATION_ID = /^[A-Za-z0-9_-]+$/;

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const clientCorrelationId = req.headers['x-correlation-id'] as
      string | undefined;

    const correlationId =
      clientCorrelationId &&
      clientCorrelationId.length <= MAX_CORRELATION_ID_LENGTH &&
      SAFE_CORRELATION_ID.test(clientCorrelationId)
        ? clientCorrelationId
        : uuidv7();

    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    next();
  }
}
