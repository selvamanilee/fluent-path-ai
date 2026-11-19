// No imports: shared by the app (bundled) and by scripts run directly with Node.
/**
 * Finds the Postgres connection string. Vercel storage integrations name it DATABASE_URL or POSTGRES_URL,
 * or add a custom prefix chosen when connecting (e.g. PROD_DATABASE_URL); all of these are accepted.
 */
export function databaseUrl(env: Record<string, string | undefined> = process.env): string {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  if (env.POSTGRES_URL) return env.POSTGRES_URL;
  const keys = Object.keys(env).filter(k => env[k]).sort();
  const key = keys.find(k => /^[A-Z0-9_]+_DATABASE_URL$/.test(k)) ?? keys.find(k => /^[A-Z0-9_]+_POSTGRES_URL$/.test(k));
  return key ? env[key]! : '';
}
