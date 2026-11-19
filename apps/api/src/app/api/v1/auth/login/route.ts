import { z } from 'zod';
import { NextResponse } from 'next/server';
import { route, body } from '@/lib/http';
import { one } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { verifyPassword, signAccess, issueRefresh, refreshCookie } from '@/lib/auth';

const Z = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(128) });

export const POST = route({ auth: false, limit: 'auth' }, async ({ req }) => {
  const b = await body(req, Z);
  const u = await one<any>(`SELECT u.id, u.email, u.display_name, u.password_hash, p.onboarded_at FROM users u JOIN learner_profiles p ON p.user_id=u.id WHERE u.email=$1`, [b.email]);
  // Same message for unknown email and wrong password (no account enumeration).
  if (!u || !(await verifyPassword(b.password, u.password_hash))) throw new ApiError(401, 'UNAUTHORIZED', 'Email or password is incorrect.');
  const res = NextResponse.json({ data: { accessToken: await signAccess(u.id), user: { id: u.id, email: u.email, displayName: u.display_name, onboarded: !!u.onboarded_at } } });
  res.headers.append('Set-Cookie', refreshCookie(await issueRefresh(u.id)));
  return res;
});
