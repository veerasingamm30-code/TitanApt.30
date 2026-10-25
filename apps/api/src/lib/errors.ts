import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodSchema } from 'zod';

export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;
  expose: boolean;

  constructor(status: number, code: string, message: string, options?: { details?: unknown; expose?: boolean }) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = options?.details;
    this.expose = options?.expose ?? true;
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new AppError(400, code, message, { details });
export const unauthorized = (message = 'Please sign in to continue.') =>
  new AppError(401, 'UNAUTHENTICATED', message);
export const forbidden = (message = 'You do not have access to this resource.') =>
  new AppError(403, 'FORBIDDEN', message);
export const notFound = (message = 'The requested resource was not found.') =>
  new AppError(404, 'NOT_FOUND', message);
export const conflict = (code: string, message: string, details?: unknown) =>
  new AppError(409, code, message, { details });
export const tooMany = (message = 'Too many requests. Please wait and try again.') =>
  new AppError(429, 'RATE_LIMITED', message);

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function parseBody<T>(schema: ZodSchema<T>, req: Request): T {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    throw badRequest('VALIDATION_ERROR', 'Please check the highlighted fields.', result.error.flatten());
  }
  return result.data;
}

export function parseQuery<T>(schema: ZodSchema<T>, req: Request): T {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    throw badRequest('VALIDATION_ERROR', 'Invalid query parameters.', result.error.flatten());
  }
  return result.data;
}
