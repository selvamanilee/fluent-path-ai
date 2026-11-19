import { route, parseId } from '@/lib/http';
import { getAttempt } from '@/lib/exams';
export const GET = route<{ id: string }>({}, async ({ params, userId }) => getAttempt(userId, parseId(params.id)));
