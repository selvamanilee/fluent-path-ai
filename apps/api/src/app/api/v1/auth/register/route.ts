import { z } from 'zod';
import { route, body, cleanText } from '@/lib/http';
import { tx, one, q } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { hashPassword, signAccess, issueRefresh, refreshCookie } from '@/lib/auth';
import { NextResponse } from 'next/server';

const Z = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8, 'Use at least 8 characters.').max(128),
  displayName: cleanText(60).pipe(z.string().min(1, 'Please tell us your name.')),
});

export const POST = route({ auth: false, limit: 'auth' }, async ({ req }) => {
  const b = await body(req, Z);
  const exists = await one('SELECT 1 FROM users WHERE email=$1', [b.email]);
  if (exists) throw new ApiError(409, 'CONFLICT', 'An account with this email already exists. Try signing in.');
  const hash = await hashPassword(b.password);
  const user = await tx(async c => {
    const u = await one<any>('INSERT INTO users(email, password_hash, display_name) VALUES ($1,$2,$3) RETURNING id, email, display_name', [b.email, hash, b.displayName], c);
    await q('INSERT INTO learner_profiles(user_id) VALUES ($1)', [u.id], c);
    await q('INSERT INTO user_preferences(user_id) VALUES ($1)', [u.id], c);
    await q('INSERT INTO learning_streaks(user_id) VALUES ($1)', [u.id], c);
    return u;
  });
  const res = NextResponse.json({ data: { accessToken: await signAccess(user.id), user: { id: user.id, email: user.email, displayName: user.display_name, onboarded: false } } }, { status: 201 });
  res.headers.append('Set-Cookie', refreshCookie(await issueRefresh(user.id)));
  return res;
});
