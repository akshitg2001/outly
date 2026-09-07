import { runtimeValue } from './runtime';

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytes = 24) {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...values)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export async function hashToken(token: string) {
  const pepper = runtimeValue('TOKEN_PEPPER') ?? 'outly-local-preview';
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${pepper}:${token}`));
  return toHex(digest);
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

export async function createAdminSession() {
  const secret = runtimeValue('ADMIN_PASSCODE');
  if (!secret) throw new Error('Admin access has not been configured.');
  const expires = Date.now() + 8 * 60 * 60 * 1000;
  const payload = `${expires}`;
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function verifyAdminSession(request: Request) {
  const secret = runtimeValue('ADMIN_PASSCODE');
  if (!secret) return false;
  const cookie = request.headers.get('cookie') ?? '';
  const value = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('outly_admin='))?.slice('outly_admin='.length);
  if (!value) return false;
  const [expiresValue, signature] = value.split('.');
  const expires = Number(expiresValue);
  if (!Number.isFinite(expires) || expires < Date.now() || !signature) return false;
  return (await hmac(expiresValue, secret)) === signature;
}

export function adminCookie(value: string, secure = true) {
  return `outly_admin=${value}; Path=/; HttpOnly; SameSite=Strict; ${secure ? 'Secure; ' : ''}Max-Age=${8 * 60 * 60}`;
}
