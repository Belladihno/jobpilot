import 'reflect-metadata';
import { Query } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

export const ZOD_VALIDATED_QUERY = 'zodValidatedQuery';

export function ZodQuery(schema: z.ZodType): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    Query(new ZodValidationPipe(schema))(target, propertyKey, parameterIndex);

    const handler = (target as Record<string | symbol, object>)[
      propertyKey as string | symbol
    ];
    Reflect.defineMetadata(ZOD_VALIDATED_QUERY, true, handler);
  };
}
