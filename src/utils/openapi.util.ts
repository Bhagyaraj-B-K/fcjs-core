import 'zod-openapi/extend';
import z from 'zod';
import { createDocument, ZodOpenApiPathsObject } from 'zod-openapi';
import { Logger } from './logger.util.js';
import {
  basePathMetadataKey,
  ControllerRegistry,
  getDefaultStatusCode,
  RouteDefinition,
  routesMetadataKey,
} from '../decorators/route.decorator.js';
import { openapiBodyMetadataKey } from '../decorators/body-dto.decorator.js';
import { openapiQueryMetadataKey } from '../decorators/query-dto.decorator.js';
import { openapiResponseMetadataKey } from '../decorators/response-dto.decorator.js';
import { openapiMWMetadataKey } from '../decorators/middleware.decorator.js';

export class OpenApiDoc {
  constructor(title: string = 'My FCJs API') {
    const controllers = ControllerRegistry;
    const paths: ZodOpenApiPathsObject = {};

    controllers.forEach((Controller) => {
      const prototype = Controller.prototype;

      const basePath: string = Reflect.getMetadata(
        basePathMetadataKey,
        Controller,
      );
      const routes: RouteDefinition[] =
        Reflect.getMetadata(routesMetadataKey, Controller) || [];

      if (!basePath || routes.length === 0) {
        const name = Controller.name || 'Unknown';
        Logger.warn(
          'OpenAPI',
          `Controller "${name}" is missing route metadata and will be skipped in OpenAPI docs.`,
        );
        return;
      }

      routes.forEach(({ method, path, handlerName }) => {
        const fullPath = `${basePath}${path}`;

        const querySchema = Reflect.getMetadata(
          openapiQueryMetadataKey,
          prototype,
          handlerName,
        );
        const bodySchema = Reflect.getMetadata(
          openapiBodyMetadataKey,
          prototype,
          handlerName,
        );
        const responseSchema = Reflect.getMetadata(
          openapiResponseMetadataKey,
          prototype,
          handlerName,
        );
        const middlewareMeta = Reflect.getMetadata(
          openapiMWMetadataKey,
          prototype,
          handlerName,
        );

        let pathSchema = z.object({});
        const normalizedPath = fullPath
          .replace(/\/+/g, '/')
          .replace(/:\w+/g, (match) => {
            const key = match.substring(1);
            pathSchema = pathSchema.merge(z.object({ [key]: z.string() }));
            return `{${key}}`;
          });

        let headerSchema = z.object({});
        if (middlewareMeta?.headerKey) {
          headerSchema = headerSchema.merge(
            z.object({
              [middlewareMeta.headerKey]: z
                .string()
                .openapi({ description: middlewareMeta.description }),
            }),
          );
        }

        const requestParams = {
          path: pathSchema,
          query: querySchema,
          header: headerSchema,
        };

        const requestBody = bodySchema
          ? {
              content: {
                'application/json': {
                  schema: bodySchema,
                },
              },
            }
          : undefined;

        const errorSchema = (mssg: string) => {
          const schema = z.object({
            success: z.boolean().default(false),
            error: z.string().default(mssg),
            details: z.object({}),
          });
          return {
            description: mssg,
            content: {
              'application/json': {
                schema,
              },
            },
          };
        };
        const responses: Record<number, object> = {
          500: errorSchema('Internal Server Error'),
        };
        if (bodySchema || querySchema) {
          responses[400] = errorSchema('Bad Request');
        }
        if (middlewareMeta) {
          responses[401] = errorSchema('Unauthorized');
        }
        if (Object.keys(pathSchema.shape).length) {
          responses[404] = errorSchema('Not Found');
        }

        responses[getDefaultStatusCode(method)] = responseSchema
          ? {
              description: 'Success',
              content: {
                'application/json': {
                  schema: z.object({
                    success: z.boolean().default(true),
                    data: responseSchema,
                  }),
                },
              },
            }
          : {
              description: 'Success',
            };

        paths[normalizedPath] = {
          ...(paths[normalizedPath] || {}),
          [method]: {
            tags: [Controller.name],
            operationId: camelToHuman(handlerName),
            summary: camelToHuman(handlerName),
            requestParams,
            requestBody,
            responses,
          },
        };
      });
    });

    return createDocument({
      openapi: '3.1.0',
      info: {
        title,
        version: '1.0.0',
      },
      paths,
    });
  }
}

function camelToHuman(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word.toLowerCase(),
    )
    .join(' ');
}
