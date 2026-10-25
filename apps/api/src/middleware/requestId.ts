import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  const id = incoming && /^[A-Za-z0-9-]{8,80}$/.test(incoming) ? incoming : randomUUID();
  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
