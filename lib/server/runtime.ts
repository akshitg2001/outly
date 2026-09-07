import { env } from 'cloudflare:workers';

export type OutlyEnv = {
  DB?: D1Database;
  GOOGLE_MAPS_API_KEY?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  ADMIN_PASSCODE?: string;
  TOKEN_PEPPER?: string;
  APP_BASE_URL?: string;
};

export function runtimeEnv(): OutlyEnv {
  return env as unknown as OutlyEnv;
}

export function runtimeValue(key: keyof Omit<OutlyEnv, 'DB'>) {
  const workerValue = runtimeEnv()[key];
  if (typeof workerValue === 'string' && workerValue.trim()) return workerValue.trim();
  const processValue = typeof process !== 'undefined' ? process.env[key] : undefined;
  return processValue?.trim() || undefined;
}

export function getDatabase() {
  const database = runtimeEnv().DB;
  if (!database) throw new Error('Outly database binding is not configured.');
  return database;
}
