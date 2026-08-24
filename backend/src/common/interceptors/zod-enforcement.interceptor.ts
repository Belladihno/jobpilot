import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { ZOD_VALIDATED_BODY } from '../decorators/zod-body.decorator';

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

@Injectable()
export class ZodEnforcementInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    if (BODY_METHODS.has(request.method)) {
      const isMultipart = (request.headers['content-type'] ?? '').startsWith(
        'multipart/form-data',
      );

      if (!isMultipart) {
        const validated = this.reflector.getAllAndOverride<boolean>(
          ZOD_VALIDATED_BODY,
          [context.getHandler(), context.getClass()],
        );

        const body = request.body as Record<string, unknown> | undefined;
        if (!validated && body && Object.keys(body).length > 0) {
          throw new InternalServerErrorException(
            `Route ${request.method} ${String(request.url)} accepts a body but has no Zod schema validation`,
          );
        }
      }
    }

    return next.handle();
  }
}
