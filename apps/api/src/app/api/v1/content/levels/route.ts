import { route } from '@/lib/http';
import { q } from '@/lib/db';
export const GET = route({}, async () => q('SELECT id, code, name, description, pass_threshold::float FROM learning_levels ORDER BY id'));
