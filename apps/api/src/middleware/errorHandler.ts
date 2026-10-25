import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { env } from '../env.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'NOT_FOUND', `No route matches ${req.method} ${req.path}.`));
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong. Please try again.';
  let details: unknown;

  if (error instanceof AppError) {
    status = error.status;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Please check the submitted values.';
    details = error.flatten();
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      status = 409;
      code = 'CONFLICT';
      message = 'That record already exists.';
    } else if (error.code === 'P2025') {
      status = 404;
      code = 'NOT_FOUND';
      message = 'The requested record was not found.';
    } else if (error.code === 'P2003') {
      status = 409;
      code = 'RELATION_CONFLICT';
      message = 'That action conflicts with related records.';
    }
  } else if (error instanceof SyntaxError && 'body' in error) {
    status = 400;
    code = 'INVALID_JSON';
    message = 'The request body could not be read.';
  }

  if (status >= 500) {
    console.error(
      JSON.stringify({
        level: 'error',
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        ...(env.NODE_ENV !== 'production' && error instanceof Error ? { stack: error.stack } : {}),
      }),
    );
  }

  res.status(status).json({
    error: {
      code,
      message,
      requestId: req.requestId,
      ...(details ? { details } : {}),
    },
  });
}
