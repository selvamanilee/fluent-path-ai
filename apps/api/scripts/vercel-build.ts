// Vercel build: apply migrations + idempotent seed when a database is configured, then build Next.js.
import { execSync } from 'node:child_process';
import { databaseUrl } from '../src/lib/database-url.ts';
const run = (cmd: string) => execSync(cmd, { stdio: 'inherit' });
if (databaseUrl()) {
  run('node scripts/migrate.ts');
  run('node scripts/seed.ts');
} else {
  console.warn('DATABASE_URL is not set: skipping migrations and seed. The API will report db:false until it is configured.');
}
run('npx next build');
