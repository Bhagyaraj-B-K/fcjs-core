import { ZodError, ZodObject, ZodRawShape } from 'zod';
import { BadRequestError } from '../utils/exceptions.util.js';
import { Request, Response } from 'express';

export const openapiBodyMetadataKey = Symbol('openapi:requestBody');

export function BodyDto(schema: ZodObject<ZodRawShape>) {
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
        schema.strict().parse(req.body);

        return await originalMethod.call(this, req, res, ...args);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new BadRequestError('Invalid Request body', err.errors);
        }

        throw err;
      }
    };

    Reflect.defineMetadata(openapiBodyMetadataKey, schema, target, propertyKey);
  };
}
