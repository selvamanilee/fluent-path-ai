import { route } from '@/lib/http';
import { one } from '@/lib/db';
import { agentHealth } from '@/lib/agent';

export const GET = route({ auth: false }, async () => {
  let db = false;
  try { db = !!(await one('SELECT 1 AS ok')); } catch { db = false; }
  const agent = await agentHealth();
  return { db, agent, evaluation: agent.reachable && agent.model_ready ? 'llm' : 'rules' };
});
