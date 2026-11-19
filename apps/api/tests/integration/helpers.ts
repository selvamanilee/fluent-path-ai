import { NextRequest } from 'next/server';

type H = (req: NextRequest, ctx: { params: Promise<any> }) => Promise<Response>;
export async function call(handler: H, opts: { method?: string; body?: unknown; token?: string; params?: Record<string, string>; cookie?: string; query?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}` };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.cookie) headers.cookie = opts.cookie;
  const req = new NextRequest(`http://localhost/api/v1/x${opts.query ?? ''}`, { method: opts.method ?? 'GET', headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  const json = await res.json();
  return { status: res.status, json, data: json.data, error: json.error, setCookie: res.headers.get('set-cookie') };
}
