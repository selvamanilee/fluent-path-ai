import pg from 'pg';
import { databaseUrl } from './config';

declare global {
  // eslint-disable-next-line no-var
  var __fpPool: pg.Pool | undefined;
}

export function pool(): pg.Pool {
  if (!globalThis.__fpPool) {
    const connectionString = databaseUrl();
    if (!connectionString) throw new Error('DATABASE_URL is not set');
    globalThis.__fpPool = new pg.Pool({
      connectionString,
      // Serverless functions each hold their own pool: keep it small (use a pooled/PgBouncer URL in production).
      max: Number(process.env.PG_POOL_MAX ?? (process.env.VERCEL ? 3 : 10)),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalThis.__fpPool;
}

export type Db = pg.Pool | pg.PoolClient;

export async function q<T = any>(sql: string, params: unknown[] = [], db: Db = pool()): Promise<T[]> {
  const res = await db.query(sql, params as any[]);
  return res.rows as T[];
}

export async function one<T = any>(sql: string, params: unknown[] = [], db: Db = pool()): Promise<T | null> {
  const rows = await q<T>(sql, params, db);
  return rows[0] ?? null;
}

export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query('BEGIN');
    const out = await fn(c);
    await c.query('COMMIT');
    return out;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
