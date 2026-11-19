import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError, ZodType } from 'zod';
import { ApiError, badRequest } from './errors';
import { verifyAccess } from './auth';
import { hit, LimitKind } from './ratelimit';

export interface Ctx<P = Record<string, string>> { req: NextRequest; userId: string; params: P; ip: string }

type Handler<P> = (ctx: Ctx<P>) => Promise<unknown>;
interface Opts { auth?: boolean; limit?: LimitKind }

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

function errorResponse(e: unknown) {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: { code: e.code, message: e.message, details: e.details } }, { status: e.status });
  }
  if (e instanceof ZodError) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Some fields are not valid.', details: e.issues.map(i => ({ path: i.path.join('.'), message: i.message })) } }, { status: 400 });
  }
  console.error(JSON.stringify({ level: 'error', msg: 'unhandled', err: e instanceof Error ? { message: e.message, stack: e.stack } : String(e) }));
  return NextResponse.json({ error: { code: 'INTERNAL', message: 'Something went wrong on our side. Please try again.' } }, { status: 500 });
}

export function route<P = Record<string, string>>(opts: Opts, fn: Handler<P>) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    const started = Date.now();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
    let userId = '';
    try {
      if (opts.auth !== false) {
        const h = req.headers.get('authorization') ?? '';
        const token = h.startsWith('Bearer ') ? h.slice(7) : '';
        const uid = token ? await verifyAccess(token) : null;
        if (!uid) throw new ApiError(401, 'UNAUTHORIZED', 'Please sign in again.');
        userId = uid;
      }
      const kind = opts.limit ?? 'default';
      const rl = hit(kind === 'auth' ? ip : userId || ip, kind);
      if (!rl.ok) {
        return NextResponse.json({ error: { code: 'RATE_LIMITED', message: `Too many requests. Try again in ${rl.retryAfter} seconds.` } }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
      }
      const params = (await ctx?.params) ?? ({} as P);
      const out = await fn({ req, userId, params, ip });
      return out instanceof Response ? out : json(out);
    } catch (e) {
      return errorResponse(e);
    } finally {
      if (process.env.NODE_ENV !== 'test') {
        console.log(JSON.stringify({ level: 'info', method: req.method, path: req.nextUrl.pathname, ms: Date.now() - started, user: userId ? userId.slice(0, 8) : undefined }));
      }
    }
  };
}

export async function body<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest('Request body must be valid JSON.');
  }
  return schema.parse(raw);
}

export const uuid = z.string().uuid();
export function parseId(id: string) {
  const r = uuid.safeParse(id);
  if (!r.success) throw badRequest('Invalid id.');
  return r.data;
}

/** Strip control characters and trim; cap length. Output is rendered as text (never HTML) by the client. */
export const cleanText = (max: number) => z.string().transform(s => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()).pipe(z.string().max(max));
