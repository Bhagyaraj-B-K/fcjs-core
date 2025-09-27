import { ZodSchema } from 'zod';
import { InternalServerError } from '../utils/exceptions.util.js';
import { Request, Response } from 'express';
import { ZodUtil } from '../utils/zod.util.js';

export const openapiResponseMetadataKey = Symbol('openapi:responseBody');

export function ResponseDto(schema: ZodSchema) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      req: Request,
      res: Response,
      ...args: unknown[]
    ) {
      try {
        const result = await originalMethod.call(this, req, res, ...args);
        const validated = schema.parse(result);

        return validated;
      } catch (err) {
        if (ZodUtil.isZodError(err)) {
          throw new InternalServerError('Invalid Response body', err.issues);
        }

        throw err;
      }
    };

    Reflect.defineMetadata(
      openapiResponseMetadataKey,
      schema,
      target,
      propertyKey,
    );
  };
}
