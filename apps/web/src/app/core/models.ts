export interface User { id: string; email: string; displayName: string; onboarded: boolean }
export interface AuthResponse { accessToken: string; user: User }
export interface ApiErrorBody { code: string; message: string; details?: { path: string; message: string }[] }

export interface Correction { original: string; corrected: string; explanation: string; explanation_ta?: string; category: string }
export interface Evaluation {
  score: number; corrections: Correction[]; natural_version: string; professional_version?: string;
  feedback: string; repeat_practice?: string; criteria?: Record<string, number>; evaluator: 'rules' | 'llm'; reference?: string;
}
export interface ItemResult { prompt: string; yourAnswer: string; correct: boolean; expected: string | null; explanation: string; evaluation?: Evaluation }
export interface PracticeQ { prompt: string; kind: 'mcq' | 'fill' | 'correct' | 'free'; options: string[] | null }
export interface TurnQ { prompt: string; prompt_ta: string | null; pattern: string }
export interface TurnResult { evaluation: Evaluation; pronunciationAssessed: false; next: ({ index: number } & TurnQ) | null; summary?: { score: number; achievements: string[] } | null }

export type ActivityKind = 'vocabulary' | 'phrases' | 'phrasal_verbs' | 'grammar' | 'reading' | 'writing' | 'speaking' | 'technical' | 'revision' | 'mini_exam';
export interface Activity { id: string; seq: number; kind: ActivityKind; title: string; minutes: number; content: any; state: any; status: 'pending' | 'in_progress' | 'done'; score: number | null; result: any }
export interface LearningDay { day: { id: string; day_number: number; local_date: string; title: string; status: string; seconds_spent: number }; activities: Activity[]; currentIndex: number }

export interface Word { id: string; word: string; meaning_ta: string; meaning_en: string; pronunciation: string; ipa: string | null; part_of_speech: string; example: string; example_ta: string; synonym: string | null; antonym: string | null; status?: string; source?: string }
