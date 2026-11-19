import { execSync } from 'node:child_process';
export default function setup() {
  const env = { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://fluentpath:fluentpath@localhost:5432/fluentpath_test' };
  execSync('node scripts/migrate.ts --reset && node scripts/seed.ts', { env, stdio: 'inherit' });
}
