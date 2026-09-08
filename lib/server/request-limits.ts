import { getDatabase } from './runtime';
import { hashToken } from './security';

export class RequestLimitError extends Error {
  constructor(public retryAfter: number) { super('Too many requests. Please wait a little and try again.'); }
}

export async function enforceLimit(scope: string, identity: string, limit: number, seconds: number) {
  const key = await hashToken(scope + ':' + identity);
  const now = Date.now();
  const db = getDatabase();
  const row = await db.prepare(`INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = CASE WHEN expires_at <= ? THEN 1 ELSE count + 1 END,
      expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END
    RETURNING count, expires_at`).bind(key, now + seconds * 1000, now, now).first<{ count: number; expires_at: number }>();
  if (row && row.count > limit) throw new RequestLimitError(Math.max(1, Math.ceil((row.expires_at - now) / 1000)));
}

export async function limitRequest(request: Request, scope: string, count: number, seconds: number) {
  await enforceLimit(scope, request.headers.get('CF-Connecting-IP') ?? 'shared-preview', count, seconds);
}

export async function readJson<T>(request: Request, maxBytes = 16_384): Promise<T> {
  const announced = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(announced) && announced > maxBytes) throw new Error('This request is too large. Shorten the submitted text and try again.');
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) throw new Error('This request is too large. Shorten the submitted text and try again.');
  try { return JSON.parse(body) as T; }
  catch { throw new Error('The submitted information could not be read. Refresh and try again.'); }
}

export async function purgeExpiredRateLimits() {
  await getDatabase().prepare('DELETE FROM rate_limits WHERE expires_at <= ?').bind(Date.now()).run();
}

export function apiError(error: unknown) {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
  if (error instanceof RequestLimitError) headers['Retry-After'] = String(error.retryAfter);
  return Response.json({ error: error instanceof Error ? error.message : 'Could not complete the request.' }, { status: error instanceof RequestLimitError ? 429 : 400, headers });
}
