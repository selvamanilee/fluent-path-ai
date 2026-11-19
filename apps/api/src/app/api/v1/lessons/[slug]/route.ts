import { route } from '@/lib/http';
import { getLesson } from '@/lib/lessons';
import { publicPractice } from '@/lib/content';

export const GET = route<{ slug: string }>({}, async ({ params, userId }) => {
  const l = await getLesson(params.slug, userId);
  return { slug: l.slug, title: l.title, stage: l.stage, explanation: l.explanation, explanation_ta: l.explanation_ta, rule: l.rule,
    basic_examples: l.basic_examples, professional_examples: l.professional_examples, practice: publicPractice(l.practice), source: l.source };
});
