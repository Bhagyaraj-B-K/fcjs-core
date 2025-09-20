import { Request, Response, NextFunction } from 'express';
import { RouteDefinition } from './route.decorator.js';

const middlewareMetadataKey = Symbol('middlewares');
export const openapiMWMetadataKey = Symbol('openapi:middleware');

export interface MiddlewareMetadata {
  fn: (req: Request, res: Response, next: NextFunction) => void;
  headerKey?: string;
  description?: string;
}

export function Middleware(
  MiddlewareClass: new () => {
    handler: (req: Request, res: Response, next: NextFunction) => void;
    headerKey: string;
    description?: string;
  },
): MethodDecorator {
  return (target, propertyKey) => {
    const existing: MiddlewareMetadata[] =
      Reflect.getMetadata(middlewareMetadataKey, target, propertyKey!) || [];

    const instance = new MiddlewareClass();
    const { handler: fn, headerKey, description } = instance;
    const wrappedFn = (req: Request, res: Response, next: NextFunction) => {
      try {
        fn(req, res, next);
      } catch (err) {
        next(err);
      }
    };

    existing.push({ fn: wrappedFn, headerKey, description });

    Reflect.defineMetadata(
      middlewareMetadataKey,
      existing,
      target,
      propertyKey!,
    );

    Reflect.defineMetadata(
      openapiMWMetadataKey,
      { headerKey, description },
      target,
      propertyKey,
    );
  };
}

export function getMiddlewares(target: object, propertyKey: string) {
  return (Reflect.getMetadata(middlewareMetadataKey, target, propertyKey) ||
    []) as RouteDefinition['middlewares'];
}
