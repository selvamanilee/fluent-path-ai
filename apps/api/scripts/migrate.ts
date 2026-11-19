// Applies db/migrations/*.sql in order, tracking applied files in schema_migrations.
import pg from 'pg';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../../../db/migrations');
const url = (process.env.DATABASE_URL || process.env.POSTGRES_URL);
if (!url) { console.error('DATABASE_URL is not set'); process.exit(1); }
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  if (process.argv.includes('--reset')) {
    if (process.env.NODE_ENV === 'production') throw new Error('Refusing to reset a production database');
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.log('schema reset');
  }
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map(r => r.name));
  for (const f of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
    if (done.has(f)) continue;
    await client.query('BEGIN');
    await client.query(readFileSync(join(dir, f), 'utf8'));
    await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [f]);
    await client.query('COMMIT');
    console.log('applied', f);
  }
  console.log('migrations up to date');
} catch (e) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(e);
  process.exitCode = 1;
} finally {
  await client.end();
}
