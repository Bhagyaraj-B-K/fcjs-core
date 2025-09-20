export class HttpException extends Error {
  public statusCode: number;
  public details?: object;

  constructor(message: string, statusCode = 500, details?: object) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class InternalServerError extends HttpException {
  constructor(message: string = 'Internal Server Error', details?: object) {
    super(message, 500, details);
  }
}

export class BadRequestError extends HttpException {
  constructor(message: string = 'Bad Request', details?: object) {
    super(message, 400, details);
  }
}

export class NotFoundError extends HttpException {
  constructor(message: string = 'Not Found', details?: object) {
    super(message, 404, details);
  }
}

export class UnauthorizedError extends HttpException {
  constructor(message: string = 'Unauthorized', details?: object) {
    super(message, 401, details);
  }
}

export class ForbiddenError extends HttpException {
  constructor(message: string = 'Forbidden', details?: object) {
    super(message, 403, details);
  }
}

export class ConflictError extends HttpException {
  constructor(message: string = 'Conflict', details?: object) {
    super(message, 409, details);
  }
}

export class TooManyRequestsError extends HttpException {
  constructor(message: string = 'Too Many Requests', details?: object) {
    super(message, 429, details);
  }
}
