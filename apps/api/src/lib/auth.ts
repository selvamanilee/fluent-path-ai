import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { q, one } from './db';

const ACCESS_TTL_SEC = 15 * 60;
export const REFRESH_TTL_DAYS = 30;
export const REFRESH_COOKIE = 'fp_refresh';

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET must be set and at least 32 characters');
  return new TextEncoder().encode(s);
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function signAccess(userId: string) {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(userId)
    .setIssuedAt().setIssuer('fluentpath').setExpirationTime(`${ACCESS_TTL_SEC}s`).sign(secret());
}

export async function verifyAccess(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: 'fluentpath', algorithms: ['HS256'] });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

const sha = (t: string) => createHash('sha256').update(t).digest('hex');

export async function issueRefresh(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await q(`INSERT INTO refresh_tokens(user_id, token_hash, expires_at) VALUES ($1,$2, now() + interval '${REFRESH_TTL_DAYS} days')`, [userId, sha(token)]);
  return token;
}

/** Rotates a refresh token. Returns the user id + new token, or null if invalid. Reuse of a revoked token revokes the whole family. */
export async function rotateRefresh(token: string): Promise<{ userId: string; token: string } | null> {
  const row = await one<{ id: string; user_id: string; revoked_at: Date | null; expires_at: Date }>(
    'SELECT id, user_id, revoked_at, expires_at FROM refresh_tokens WHERE token_hash=$1', [sha(token)]);
  if (!row) return null;
  if (row.revoked_at) {
    await q('UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [row.user_id]);
    return null;
  }
  if (row.expires_at.getTime() < Date.now()) return null;
  await q('UPDATE refresh_tokens SET revoked_at=now() WHERE id=$1', [row.id]);
  return { userId: row.user_id, token: await issueRefresh(row.user_id) };
}

export async function revokeRefresh(token: string) {
  await q('UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL', [sha(token)]);
}

export function refreshCookie(token: string | null) {
  const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
  const maxAge = token ? REFRESH_TTL_DAYS * 86400 : 0;
  return `${REFRESH_COOKIE}=${token ?? ''}; HttpOnly; SameSite=Strict; Path=/api/v1/auth; Max-Age=${maxAge}${secure}`;
}
