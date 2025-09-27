import { ZodObject, ZodRawShape } from 'zod';
import { BadRequestError } from '../utils/exceptions.util.js';
import { Request, Response } from 'express';
import { ZodUtil } from '../utils/zod.util.js';

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
        if (ZodUtil.isZodError(err)) {
          throw new BadRequestError('Invalid Request body', err.issues);
        }

        throw err;
      }
    };

    Reflect.defineMetadata(openapiBodyMetadataKey, schema, target, propertyKey);
  };
}
