import { NextResponse } from 'next/server';
import { route } from '@/lib/http';
import { revokeRefresh, refreshCookie, REFRESH_COOKIE } from '@/lib/auth';

export const POST = route({ auth: false, limit: 'default' }, async ({ req }) => {
  const token = req.cookies.get(REFRESH_COOKIE)?.value;
  if (token) await revokeRefresh(token);
  const res = NextResponse.json({ data: { ok: true } });
  res.headers.append('Set-Cookie', refreshCookie(null));
  return res;
});
