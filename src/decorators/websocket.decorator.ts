import 'reflect-metadata';
import { WebSocket, WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';
import { HttpException } from '../utils/exceptions.util.js';
import { Logger } from '../utils/logger.util.js';

export type WsHandler = (data: unknown, ws: WebSocket) => void | Promise<void>;

export interface WsRouteHandlers {
  instance: object;
  handlers: Record<string, WsHandler>;
}

const wsRoutesRegistry = new Map<string, WsRouteHandlers>();

/**
 * Class decorator to register a WS route
 */
export function WsRoute(path: string) {
  // eslint-disable-next-line
  return function (constructor: any) {
    const start = performance.now();

    const instance = new constructor();

    const messages: { event: string; methodName: string }[] =
      Reflect.getMetadata('ws:messages', constructor) || [];

    const handlers: Record<string, WsHandler> = {};
    for (const { event, methodName } of messages) {
      const originalFn = instance[methodName].bind(instance);

      handlers[event] = async (data: unknown, ws: WebSocket) => {
        try {
          const result = await originalFn(data, ws);

          if (result !== undefined) {
            ws.send(JSON.stringify(result));
          }
        } catch (err) {
          if (err instanceof HttpException) {
            ws.send(
              JSON.stringify({
                event: 'error',
                data: { message: err.message, details: err.details },
              }),
            );
          } else {
            ws.send(
              JSON.stringify({
                event: 'error',
                data: { message: 'Internal WS error' },
              }),
            );
          }
        }
      };
    }

    wsRoutesRegistry.set(path, { instance, handlers });

    const elapsed = Math.round(performance.now() - start);
    const eventNames = messages.map((m) => m.event);

    Logger.log(
      'WebSocketRoute',
      `${Logger.colorLog(`${path}`, 'pink')} (${eventNames.length} event${
        eventNames.length !== 1 ? 's' : ''
      }) → ${Logger.colorLog(
        `[${eventNames.join(', ')}]`,
        'blue',
      )}: ${Logger.colorLog(`+${elapsed}ms`, 'yellow')}`,
    );
  };
}

/**
 * Method decorator to register a WS message handler
 */
export function WsMessage(event: string) {
  return function (target: object, propertyKey: string) {
    const existing =
      Reflect.getMetadata('ws:messages', target.constructor) || [];
    existing.push({ event, methodName: propertyKey });
    Reflect.defineMetadata('ws:messages', existing, target.constructor);
  };
}

/**
 * Helper to safely get all WS routes
 */
export function getWsRoutesRegistry(): Map<string, WsRouteHandlers> {
  return wsRoutesRegistry;
}

/**
 * Load all WS routes
 */
export function loadWsRoutes(server: HttpServer, controllers: unknown[]) {
  const globalStart = performance.now();
  try {
    if (controllers.length === 0) {
      console.warn('No WS controllers found');
    }
    const wss = new WebSocketServer({ server });

    const registry = getWsRoutesRegistry();

    let totalRoutes = 0;
    let totalEvents = 0;
    registry.forEach((routeEntry) => {
      const eventNames = Object.keys(routeEntry.handlers);
      totalRoutes += 1;
      totalEvents += eventNames.length;
    });

    wss.on('connection', (ws, req) => {
      const url = req.url || '/';
      const routeEntry = registry.get(url);

      if (!routeEntry) {
        ws.close(1008, 'No WS route handler found');
        return;
      }

      ws.on('message', async (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          const handler = routeEntry.handlers[msg.event as string];

          if (!handler) {
            ws.send(
              JSON.stringify({
                event: 'error',
                data: { message: `Unknown event: ${msg.event}` },
              }),
            );
            return;
          }

          await handler.call(routeEntry.instance, msg.data, ws);
        } catch (err) {
          if (err instanceof HttpException) {
            ws.send(
              JSON.stringify({
                event: 'error',
                data: { message: err.message, details: err.details },
              }),
            );
            return;
          } else {
            ws.send(
              JSON.stringify({
                event: 'error',
                data: { message: 'WS handler error' },
              }),
            );
          }
        }
      });
    });

    const globalEnd = performance.now();
    const totalElapsed = Math.round(globalEnd - globalStart);

    Logger.log(
      'WebSocket',
      `${Logger.colorLog('All WS routes loaded ✔', 'green')} (${totalRoutes} routes, ${totalEvents} events): ${Logger.colorLog(
        `+${totalElapsed}ms`,
        'yellow',
      )}`,
    );
  } catch (error) {
    Logger.error('WebSocket', `Error loading WS routes: ${error}`);
  }
}
