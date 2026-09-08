import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { enforceLimit, readJson, RequestLimitError } from './request-limits';

let sqlite: DatabaseSync;
const runtime = vi.hoisted(() => ({ database: null as unknown }));
vi.mock('./runtime', () => ({ getDatabase: () => runtime.database, runtimeValue: () => undefined }));

function prepared(sql: string, bindings: unknown[] = []) {
  return {
    bind: (...values: unknown[]) => prepared(sql, values),
    run: async () => ({ success: true, meta: { changes: Number(sqlite.prepare(sql).run(...bindings as never[]).changes) } }),
    first: async () => sqlite.prepare(sql).get(...bindings as never[]) ?? null,
  };
}

beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('CREATE TABLE rate_limits (`key` text PRIMARY KEY NOT NULL, `count` integer NOT NULL, `expires_at` integer NOT NULL)');
  runtime.database = { prepare: (sql: string) => prepared(sql) };
});
afterEach(() => { vi.restoreAllMocks(); sqlite.close(); });

describe('request limits', () => {
  it('returns a retry time and resets after the fixed window expires', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    await enforceLimit('join', 'device-a', 2, 60);
    await enforceLimit('join', 'device-a', 2, 60);
    await expect(enforceLimit('join', 'device-a', 2, 60)).rejects.toBeInstanceOf(RequestLimitError);
    await expect(enforceLimit('join', 'device-a', 2, 60)).rejects.toMatchObject({ retryAfter: 60 });

    vi.spyOn(Date, 'now').mockReturnValue(1_060_001);
    await expect(enforceLimit('join', 'device-a', 2, 60)).resolves.toBeUndefined();
  });

  it('rejects oversized and unreadable request bodies', async () => {
    await expect(readJson(new Request('https://outly.test', { method: 'POST', body: '{bad' }))).rejects.toThrow('could not be read');
    await expect(readJson(new Request('https://outly.test', { method: 'POST', body: JSON.stringify({ value: '12345' }) }), 4)).rejects.toThrow('too large');
  });
});
