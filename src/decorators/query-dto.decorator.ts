import { ZodError, ZodObject, ZodRawShape } from 'zod';
import { BadRequestError } from '../utils/exceptions.util.js';
import { Request, Response } from 'express';

export const openapiQueryMetadataKey = Symbol('openapi:query');

export function QueryDto(schema: ZodObject<ZodRawShape>) {
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
        schema.strict().parse(req.query);

        return await originalMethod.call(this, req, res, ...args);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new BadRequestError('Invalid Request query params', err.errors);
        }

        throw err;
      }
    };

    Reflect.defineMetadata(
      openapiQueryMetadataKey,
      schema,
      target,
      propertyKey,
    );
  };
}
