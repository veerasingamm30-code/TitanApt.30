import type { Request } from 'express';

export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

export function redactEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return '[redacted]';
  return `${name.slice(0, 2)}***@${domain}`;
}

export function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserialisable]';
  }
}
