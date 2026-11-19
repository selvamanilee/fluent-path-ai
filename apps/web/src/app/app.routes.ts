import { Routes } from '@angular/router';
import { authGuard, guestGuard, onboardingGuard } from './core/guards';

const f = (p: Promise<any>, name: string) => p.then(m => m[name]);

export const routes: Routes = [
  { path: 'welcome', canActivate: [guestGuard], title: 'Welcome · FluentPath AI', loadComponent: () => f(import('./features/welcome/welcome'), 'Welcome') },
  { path: 'login', canActivate: [guestGuard], title: 'Sign in · FluentPath AI', loadComponent: () => f(import('./features/welcome/auth-form'), 'AuthForm'), data: { mode: 'login' } },
  { path: 'register', canActivate: [guestGuard], title: 'Create account · FluentPath AI', loadComponent: () => f(import('./features/welcome/auth-form'), 'AuthForm'), data: { mode: 'register' } },
  { path: 'onboarding', canActivate: [onboardingGuard], title: 'Get started · FluentPath AI', loadComponent: () => f(import('./features/onboarding/onboarding'), 'Onboarding') },
  { path: 'daily', canActivate: [authGuard], title: "Today's learning · FluentPath AI", loadComponent: () => f(import('./features/daily/daily'), 'Daily') },
  {
    path: '', canActivate: [authGuard], loadComponent: () => f(import('./layout/shell'), 'Shell'),
    children: [
      { path: '', title: 'Dashboard · FluentPath AI', loadComponent: () => f(import('./features/dashboard/dashboard'), 'Dashboard') },
      { path: 'learn', title: 'Learn · FluentPath AI', loadComponent: () => f(import('./features/learn/learn'), 'Learn') },
      { path: 'read', title: 'Read · FluentPath AI', loadComponent: () => f(import('./features/modules/module-list'), 'ModuleList'), data: { module: 'read' } },
      { path: 'read/:id', title: 'Reading · FluentPath AI', loadComponent: () => f(import('./features/modules/exercise'), 'Exercise'), data: { module: 'read' } },
      { path: 'write', title: 'Write · FluentPath AI', loadComponent: () => f(import('./features/modules/module-list'), 'ModuleList'), data: { module: 'write' } },
      { path: 'write/:id', title: 'Writing · FluentPath AI', loadComponent: () => f(import('./features/modules/exercise'), 'Exercise'), data: { module: 'write' } },
      { path: 'speak', title: 'Speak · FluentPath AI', loadComponent: () => f(import('./features/modules/module-list'), 'ModuleList'), data: { module: 'speak' } },
      { path: 'speak/chat', title: 'Conversation · FluentPath AI', loadComponent: () => f(import('./features/modules/tutor-chat'), 'TutorChat') },
      { path: 'speak/:id', title: 'Speaking · FluentPath AI', loadComponent: () => f(import('./features/modules/exercise'), 'Exercise'), data: { module: 'speak' } },
      { path: 'technical', title: 'Technical English · FluentPath AI', loadComponent: () => f(import('./features/modules/module-list'), 'ModuleList'), data: { module: 'technical' } },
      { path: 'technical/:id', title: 'Technical English · FluentPath AI', loadComponent: () => f(import('./features/modules/exercise'), 'Exercise'), data: { module: 'technical' } },
      { path: 'lesson', title: 'Lessons · FluentPath AI', loadComponent: () => f(import('./features/modules/lessons'), 'Lessons') },
      { path: 'lesson/:id', title: 'Lesson · FluentPath AI', loadComponent: () => f(import('./features/modules/exercise'), 'Exercise'), data: { module: 'lesson' } },
      { path: 'vocabulary', title: 'Vocabulary · FluentPath AI', loadComponent: () => f(import('./features/vocabulary/vocabulary'), 'Vocabulary') },
      { path: 'vocabulary/:slug', title: 'Vocabulary · FluentPath AI', loadComponent: () => f(import('./features/vocabulary/category'), 'Category') },
      { path: 'pronunciation', title: 'Pronunciation · FluentPath AI', loadComponent: () => f(import('./features/pronunciation/pronunciation'), 'Pronunciation') },
      { path: 'exams', title: 'Exams · FluentPath AI', loadComponent: () => f(import('./features/exams/exams'), 'Exams') },
      { path: 'exams/:id', title: 'Exam · FluentPath AI', loadComponent: () => f(import('./features/exams/exam-runner'), 'ExamRunner') },
      { path: 'progress', title: 'Progress · FluentPath AI', loadComponent: () => f(import('./features/progress/progress'), 'Progress') },
      { path: 'revision', title: 'Revision · FluentPath AI', loadComponent: () => f(import('./features/revision/revision'), 'Revision') },
      { path: 'settings', title: 'Settings · FluentPath AI', loadComponent: () => f(import('./features/settings/settings'), 'Settings') },
    ],
  },
  { path: '**', redirectTo: '' },
];
