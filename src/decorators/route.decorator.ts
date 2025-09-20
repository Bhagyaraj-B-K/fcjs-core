import 'reflect-metadata';
import { performance } from 'perf_hooks';
import {
  Application,
  ErrorRequestHandler,
  Request,
  Response,
  Router,
} from 'express';
import { HttpException } from '../utils/exceptions.util.js';
import { getMiddlewares, MiddlewareMetadata } from './middleware.decorator.js';
import { Logger } from '../utils/logger.util.js';

export const routesMetadataKey = Symbol('routes');
export const basePathMetadataKey = Symbol('basePath');

export const openapiPathMetadataKey = Symbol('openapi:path');
export const openapiMethodMetadataKey = Symbol('openapi:method');

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface RouteDefinition {
  path: string;
  method: HttpMethod;
  handlerName: string;
  middlewares?: MiddlewareMetadata[];
}

export function Route(basePath: string): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(basePathMetadataKey, basePath, target);
    registerController(target as ControllerClass);
  };
}

export type ControllerClass = new (...args: unknown[]) => unknown;
export const ControllerRegistry: ControllerClass[] = [];
export function registerController(controller: ControllerClass) {
  ControllerRegistry.push(controller);
}

function createMethodDecorator(method: HttpMethod) {
  return (path: string): MethodDecorator => {
    return (target, propertyKey) => {
      const existingRoutes: RouteDefinition[] =
        Reflect.getMetadata(routesMetadataKey, target.constructor) || [];

      existingRoutes.push({
        path,
        method,
        handlerName: propertyKey as string,
      });

      Reflect.defineMetadata(
        routesMetadataKey,
        existingRoutes,
        target.constructor,
      );

      Reflect.defineMetadata(openapiPathMetadataKey, path, target, propertyKey);
      Reflect.defineMetadata(
        openapiMethodMetadataKey,
        method,
        target,
        propertyKey,
      );
    };
  };
}

export const Get = createMethodDecorator('get');
export const Post = createMethodDecorator('post');
export const Put = createMethodDecorator('put');
export const Patch = createMethodDecorator('patch');
export const Delete = createMethodDecorator('delete');

export function getDefaultStatusCode(method: HttpMethod): number {
  switch (method) {
    case 'post':
      return 201;
    case 'delete':
      return 204;
    default:
      return 200;
  }
}

function getClientIp(req: Request) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
}

// Function to load all @Route-decorated controllers into Express
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadRoutes(app: Application, controllers: any[]) {
  Logger.log(
    'Server',
    Logger.colorLog(`Starting First-Class Js Application...`, 'green'),
  );
  const globalStart = performance.now();
  try {
    let totalRoutes = 0;

    controllers.forEach((Controller) => {
      const start = performance.now();

      const instance = new Controller();
      const controllerName = Controller.name;
      const basePath =
        Reflect.getMetadata(basePathMetadataKey, Controller) || '/';
      const routes: RouteDefinition[] =
        Reflect.getMetadata(routesMetadataKey, Controller) || [];

      const router = Router();

      routes.forEach(({ method, path, handlerName }) => {
        const handler = instance[handlerName].bind(instance);
        const middlewares = getMiddlewares(instance, handlerName);
        const middlewareFns =
          middlewares?.map((m: { fn: MiddlewareMetadata['fn'] }) => m.fn) || [];

        router[method](
          path,
          ...middlewareFns,
          async (req: Request, res: Response) => {
            const apiExecStart = performance.now();
            try {
              const result = await handler(req, res);
              if (!res.headersSent) {
                const status = getDefaultStatusCode(method);
                res.status(status);
                if (res.statusCode !== 204) {
                  res.json({ success: true, data: result });
                }
              }
            } catch (err) {
              if (err instanceof HttpException) {
                res.status(err.statusCode).json({
                  success: false,
                  error: err.message,
                  details: err.details ?? null,
                });
              } else {
                res.status(500).json({
                  success: false,
                  error: 'Internal server error',
                  details: null,
                });
              }
            }

            const apiExecEnd = performance.now();
            const apiExecTime = Math.round(apiExecEnd - apiExecStart);
            const formattedPath = decodeURI(req.originalUrl).replace(/\/$/, '');
            Logger.log(
              'API',
              `${Logger.colorLog(`${getClientIp(req)}`, 'pink')}: ${Logger.colorizeMethod(method)} ${formattedPath} ${Logger.colorLog(`(${res.statusCode})`, 'blue')}: ${Logger.colorLog(`+${apiExecTime}ms`, 'yellow')}`,
            );
          },
        );
      });

      app.use(basePath, router);
      totalRoutes += routes.length;

      const end = performance.now();
      const elapsed = Math.round(end - start);

      Logger.log(
        'Controller',
        `${Logger.colorLog(`${controllerName} {${basePath}}`, 'pink')} (${routes.length} route${routes.length !== 1 ? 's' : ''}): ${Logger.colorLog(`+${elapsed}ms`, 'yellow')}`,
      );

      routes.forEach(({ method, path }) => {
        Logger.log(
          'Routes',
          `${Logger.colorizeMethod(method)} - ${basePath}${path === '/' ? '' : path}`,
        );
      });
    });

    const globalErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
      if (err instanceof HttpException) {
        res.status(err.statusCode).json({
          success: false,
          error: err.message,
          details: err.details,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
      const formattedPath = decodeURI(req.originalUrl).replace(/\/$/, '');
      Logger.log(
        'API',
        `${Logger.colorLog(`${getClientIp(req)}`, 'pink')}: ${Logger.colorizeMethod(req.method)} ${formattedPath} ${Logger.colorLog(`(${res.statusCode})`, 'blue')}`,
      );
    };

    app.use(globalErrorHandler);

    const globalEnd = performance.now();
    const totalElapsed = Math.round(globalEnd - globalStart);

    Logger.log(
      'Routes',
      `${Logger.colorLog('All Routes loaded ✓', 'green')} (${controllers.length} controllers, ${totalRoutes} routes): ${Logger.colorLog(`+${totalElapsed}ms`, 'yellow')}`,
    );
  } catch (err) {
    Logger.error(
      'Routes',
      Logger.colorLog(`Error loading routes: ${err}`, 'red'),
    );
  }
}
