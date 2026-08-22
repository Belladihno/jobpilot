import 'reflect-metadata';
import { Body } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

export const ZOD_VALIDATED_BODY = 'zodValidatedBody';

export function ZodBody(schema: z.ZodType): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    Body(new ZodValidationPipe(schema))(target, propertyKey, parameterIndex);

    const handler = (target as Record<string | symbol, object>)[
      propertyKey as string | symbol
    ];
    Reflect.defineMetadata(ZOD_VALIDATED_BODY, true, handler);
  };
}
