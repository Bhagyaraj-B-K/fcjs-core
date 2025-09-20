# @fcjs/core

Core decorators and utilities for the First-Class JS (FCJs) framework. This package provides a set of TypeScript decorators and utility classes to rapidly build type-safe REST and WebSocket APIs using Express and Zod.

## Features

- **Express Route Decorators**: Easily define controllers and routes using decorators.
- **DTO Validation**: Validate request bodies and query parameters with Zod schemas.
- **OpenAPI Generation**: Automatically generate OpenAPI 3.1 docs from your routes and schemas.
- **Middleware Decorators**: Attach and document custom middleware to routes.
- **WebSocket Decorators**: Define WebSocket event handlers with decorators.
- **Typed Error Handling**: Built-in HTTP exception classes for robust error responses.
- **Utility Classes**: Includes logger, typecasting, and autobind utilities.

## Installation

```sh
npm install @fcjs/core
```

## Usage

### 1. Define DTOs with zod-openapi/extend

To enable OpenAPI documentation for your Zod schemas, import `zod-openapi/extend` before defining your DTOs. This allows you to use the `.openapi()` method to add metadata like descriptions and examples, which will be included in the generated OpenAPI docs.

```ts
import 'zod-openapi/extend';
import { z } from 'zod';

export const UserDto = z
  .object({
    id: z.number(),
    name: z.string(),
  })
  .openapi({
    description: 'User Data',
    example: { id: 1, name: 'John Doe' },
  });

export const CreateUserDto = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
  })
  .openapi({
    description: 'Create user body',
    example: { name: 'eg_user', email: 'user@example.com' },
  });
```

### 2. Use DTOs in Controllers

```ts
import { Route, Get, Post, BodyDto, ResponseDto } from '@fcjs/core';
import { UserDto, CreateUserDto } from './dtos';

@Route('/users')
class UserController {
  @Get('/')
  @ResponseDto(UserDto)
  async getUser(req, res) {
    // ...fetch user logic
    return { id: 1, name: 'John Doe' };
  }

  @Post('/')
  @BodyDto(CreateUserDto)
  @ResponseDto(UserDto)
  async createUser(req, res) {
    // ...create user logic
    return { id: 2, name: req.body.name };
  }
}
```

### 3. Middleware Example

You can use custom middleware classes with the `@Middleware` decorator to protect routes or add custom logic. Middleware classes should have a `handler` method that receives Express's `req`, `res`, and `next` arguments.

```ts
import { Request, Response, NextFunction } from 'express';
import { Middleware, Get, ResponseDto } from '@fcjs/core';
import { UnauthorizedError } from '../utils/exceptions.util';
import { getUserDto } from './dtos';

export class authMiddleware {
  public headerKey = 'Authorization';
  public description = 'Bearer <token>';

  public handler(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }
    const token = authHeader.split(' ')[1];
    if (token !== 'success') {
      throw new UnauthorizedError('Invalid token');
    }
    next();
  }
}

// in user.controller.ts
class UserController {
  @Get('/:id')
  @Middleware(authMiddleware)
  @ResponseDto(getUserDto)
  public async getUserById(req: Request) {
    // ...fetch user by id logic
    return { id: +req.params.id, name: 'John Doe' };
  }
}
```

### 4. Register Controllers

```ts
import express from 'express';
import { loadRoutes, Logger } from '@fcjs/core';
import { UserController } from './controllers/user.controller';

const app = express();
app.use(express.json());

loadRoutes(app, [UserController]);

app.listen(3000, () => {
  // using Logger from FCJs
  Logger.log(
    'Server',
    `FCJs Server url: ${Logger.colorLog(`http://localhost:3000`, 'cyan')}`,
  );
});
```

### 5. Generate OpenAPI Docs

```ts
import { OpenApiDoc } from '@fcjs/core';

const openApiDoc = new OpenApiDoc('My FCJs API');
// Serve openApiDoc as JSON or with Swagger UI
```

### 6. WebSocket Support

```ts
import { WsRoute, WsMessage, loadWsRoutes } from '@fcjs/core';
import { createServer } from 'http';

@WsRoute('/ws')
class ChatWsController {
  @WsMessage('message')
  handleMessage(data: { text: string }) {
    return {
      event: 'message',
      data: { text: `Echo: ${data.text}` },
    };
  }
}

const server = createServer(app);
loadWsRoutes(server, [ChatWsController]);
server.listen(3001);
```

## API Reference

- [`src/decorators/route.decorator.ts`](src/decorators/route.decorator.ts): [`Route`](src/decorators/route.decorator.ts), [`Get`](src/decorators/route.decorator.ts), [`Post`](src/decorators/route.decorator.ts), [`loadRoutes`](src/decorators/route.decorator.ts)
- [`src/decorators/body-dto.decorator.ts`](src/decorators/body-dto.decorator.ts): [`BodyDto`](src/decorators/body-dto.decorator.ts)
- [`src/decorators/query-dto.decorator.ts`](src/decorators/query-dto.decorator.ts): [`QueryDto`](src/decorators/query-dto.decorator.ts)
- [`src/decorators/response-dto.decorator.ts`](src/decorators/response-dto.decorator.ts): [`ResponseDto`](src/decorators/response-dto.decorator.ts)
- [`src/decorators/middleware.decorator.ts`](src/decorators/middleware.decorator.ts): [`Middleware`](src/decorators/middleware.decorator.ts)
- [`src/decorators/websocket.decorator.ts`](src/decorators/websocket.decorator.ts): [`WsRoute`](src/decorators/websocket.decorator.ts), [`WsMessage`](src/decorators/websocket.decorator.ts), [`loadWsRoutes`](src/decorators/websocket.decorator.ts)
- [`src/utils/logger.util.ts`](src/utils/logger.util.ts): [`Logger`](src/utils/logger.util.ts)
- [`src/utils/exceptions.util.ts`](src/utils/exceptions.util.ts): [`HttpException`](src/utils/exceptions.util.ts), [`BadRequestError`](src/utils/exceptions.util.ts), [`NotFoundError`](src/utils/exceptions.util.ts), etc.
- [`src/utils/openapi.util.ts`](src/utils/openapi.util.ts): [`OpenApiDoc`](src/utils/openapi.util.ts)
- [`src/utils/typecast.util.ts`](src/utils/typecast.util.ts): [`Typecast`](src/utils/typecast.util.ts), [`typecast`](src/utils/typecast.util.ts)
- [`src/utils/autobind.util.ts`](src/utils/autobind.util.ts): [`AutoBind`](src/utils/autobind.util.ts)

## License

MIT © Bhagyaraj BK

---

For more details, see the [GitHub repository](https://github.com/Bhagyaraj-B-K/fcjs-core).

**Example:** [fcjs-example repository](https://github.com/Bhagyaraj-B-K/fcjs-example)
