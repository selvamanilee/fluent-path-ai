import { ApiError } from './errors';

/** Database URL: DATABASE_URL (Neon integration) or POSTGRES_URL (Vercel/Supabase integrations). */
export const databaseUrl = () => process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!databaseUrl()) missing.push('DATABASE_URL');
  if ((process.env.JWT_SECRET ?? '').length < 32) missing.push('JWT_SECRET (32+ characters)');
  return missing;
}

/** Fail fast with a clear message instead of a vague 500 halfway through a request. */
export function assertConfigured() {
  const missing = missingConfig();
  if (missing.length) {
    throw new ApiError(503, 'NOT_CONFIGURED', `The server isn't set up yet (missing: ${missing.join(', ')}). See docs/10-free-tier-setup.md.`);
  }
}
