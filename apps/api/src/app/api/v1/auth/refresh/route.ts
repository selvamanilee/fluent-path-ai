import { NextResponse } from 'next/server';
import { route } from '@/lib/http';
import { one } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { rotateRefresh, signAccess, refreshCookie, REFRESH_COOKIE } from '@/lib/auth';

export const POST = route({ auth: false, limit: 'default' }, async ({ req }) => {
  const token = req.cookies.get(REFRESH_COOKIE)?.value;
  const rotated = token ? await rotateRefresh(token) : null;
  if (!rotated) {
    const res = NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Your session has ended. Please sign in.' } }, { status: 401 });
    res.headers.append('Set-Cookie', refreshCookie(null));
    return res;
  }
  const u = await one<any>(`SELECT u.id, u.email, u.display_name, p.onboarded_at FROM users u JOIN learner_profiles p ON p.user_id=u.id WHERE u.id=$1`, [rotated.userId]);
  if (!u) throw new ApiError(401, 'UNAUTHORIZED', 'Please sign in.');
  const res = NextResponse.json({ data: { accessToken: await signAccess(u.id), user: { id: u.id, email: u.email, displayName: u.display_name, onboarded: !!u.onboarded_at } } });
  res.headers.append('Set-Cookie', refreshCookie(rotated.token));
  return res;
});
