import { z } from 'zod';
import { cleanText } from './http';

const tz = z.string().max(64).refine(v => { try { new Intl.DateTimeFormat('en', { timeZone: v }); return true; } catch { return false; } }, 'Unknown timezone');

export const ProfileZ = z.object({
  displayName: cleanText(60).pipe(z.string().min(1)),
  nativeLanguage: cleanText(40).default('Tamil'),
  dailyMinutes: z.number().int().min(10).max(120).default(30),
  learningMethod: cleanText(80).default('Interactive conversation'),
  priority: cleanText(120).default('Speaking and professional communication'),
  professionalBackground: cleanText(200).default(''),
  technicalSkills: z.array(cleanText(40)).max(30).default([]),
  careerObjective: cleanText(200).default(''),
  challenges: z.array(cleanText(60)).max(20).default([]),
  timezone: tz.default('Asia/Kolkata'),
});

export const OnboardingZ = ProfileZ.extend({
  tamilSupport: z.enum(['always', 'when_needed', 'off']).default('when_needed'),
  // Learners start at Level 1 unless they choose a placement level; promotion afterwards is evidence-based.
  startLevel: z.number().int().min(1).max(3).default(1),
});
