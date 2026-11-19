import { route } from '@/lib/http';
import { one } from '@/lib/db';
import { agentHealth } from '@/lib/agent';

export const GET = route({ auth: false }, async () => {
  let db = false;
  let dbError: string | undefined;
  try { db = !!(await one('SELECT 1 AS ok')); } catch (e: any) { db = false; dbError = e?.code ?? 'connection failed'; }
  const agent = await agentHealth();
  // Which settings are present (booleans only — never values) so a deployment can be verified remotely.
  const config = {
    databaseUrl: !!process.env.DATABASE_URL, jwtSecret: (process.env.JWT_SECRET ?? '').length >= 32,
    agentUrl: !!process.env.AGENT_URL, agentToken: !!process.env.AGENT_SERVICE_TOKEN, cookieSecure: process.env.COOKIE_SECURE === 'true',
  };
  return { db, dbError, agent, evaluation: agent.reachable && agent.model_ready ? 'llm' : 'rules', config };
});
