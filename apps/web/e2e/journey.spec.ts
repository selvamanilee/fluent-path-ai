import { test, expect, Page } from '@playwright/test';
import { register, onboard, noHorizontalOverflow } from './helpers';

const firstOptionEach = async (page: Page, group = page.getByRole('radiogroup')) => {
  await group.first().waitFor();
  const n = await group.count();
  for (let i = 0; i < n; i++) await group.nth(i).getByRole('radio').first().click();
};
const fillAll = async (page: Page, text: string) => {
  const inputs = page.locator('main input.input:visible, fp-daily input.input:visible');
  await inputs.first().waitFor();
  const n = await inputs.count();
  for (let i = 0; i < n; i++) await inputs.nth(i).fill(text);
};
const check = (page: Page) => page.getByRole('button', { name: /^Check my/ }).click();
const cont = async (page: Page, name: RegExp = /Continue|Finish today/) => { await page.getByRole('button', { name }).click(); };

test('new learner completes Day 1, progress persists after logout/login', async ({ page }) => {
  const email = await register(page);
  await onboard(page);

  // Day overview: Day 1 has no technical English
  await expect(page.getByRole('heading', { name: /Hello, English/ })).toBeVisible();
  await expect(page.getByText('Workplace English')).toHaveCount(0);
  await noHorizontalOverflow(page);
  await page.getByRole('button', { name: /^Start:/ }).click();

  // 1. Vocabulary — 10 word cards, one at a time
  await expect(page.locator('.word')).toHaveText('hello');
  await page.getByRole('button', { name: /I said it/ }).click();
  for (let i = 0; i < 9; i++) await page.getByRole('button', { name: 'Next word' }).click();
  await page.getByRole('button', { name: 'Practice these words' }).click();
  await firstOptionEach(page);
  await page.getByLabel(/Make your own sentence/).first().fill('Hello, my name is Ann.');
  await page.getByLabel(/Make your own sentence/).nth(1).fill('i is fine');
  await check(page);
  await expect(page.getByText('Your score')).toBeVisible();
  await expect(page.getByText('Rule-based check').first()).toBeVisible(); // honest evaluator label (no model here)
  await cont(page);

  // 2–3. Phrases and phrasal verbs
  for (const _ of [0, 1]) {
    await fillAll(page, 'I am fine, thank you.');
    await check(page);
    await expect(page.getByText('Your score')).toBeVisible();
    await cont(page);
  }

  // 4. Grammar: am / is / are — Tamil toggle and practice
  await page.getByRole('button', { name: /Tamil/ }).click();
  await expect(page.locator('[lang=ta]').first()).toBeVisible();
  await firstOptionEach(page);
  await fillAll(page, 'I am a developer.');
  await check(page);
  await expect(page.getByText('Your score')).toBeVisible();
  await cont(page);

  // 5. Speaking — one question at a time, with corrections
  await page.getByLabel('Your answer').fill('i is fine thank you');
  await page.getByRole('button', { name: 'Send answer' }).click();
  await expect(page.getByText('I am fine thank you.').first()).toBeVisible();
  await page.getByRole('button', { name: 'Next question' }).click();
  for (const a of ['My name is Ann.', 'I am from Chennai.', 'I am a Technical Lead.']) {
    await page.getByLabel('Your answer').fill(a);
    await page.getByRole('button', { name: 'Send answer' }).click();
    await page.getByRole('button', { name: 'Next question' }).click();
  }
  await page.getByLabel('Your answer').fill('Nice to meet you too.');
  await page.getByRole('button', { name: 'Send answer' }).click();
  await page.getByRole('button', { name: 'See my score' }).click();
  await expect(page.getByText('Conversation score')).toBeVisible();
  await expect(page.getByText(/Pronunciation is not scored/)).toBeVisible();
  await cont(page);

  // 6. Reading
  await expect(page.getByRole('heading', { name: 'Meet Ravi', exact: true })).toBeVisible();
  await firstOptionEach(page);
  await check(page);
  await expect(page.getByText('Reading score')).toBeVisible();
  await cont(page);

  // 7. Writing — pause/resume keeps the draft
  await page.getByLabel('Write your answer').fill('Myself Ann. I is from Chennai. I am engineer.');
  await page.waitForTimeout(1200); // draft autosave
  await page.getByRole('button', { name: 'Pause and close' }).click();
  await page.getByRole('button', { name: /^Continue:/ }).click();
  await expect(page.getByLabel('Write your answer')).toHaveValue(/Myself Ann/);
  await page.getByRole('button', { name: 'Check my writing' }).click();
  await expect(page.getByRole('heading', { name: 'Corrections' })).toBeVisible();
  await expect(page.getByText('I am from Chennai.').first()).toBeVisible();
  await expect(page.getByText('Professional / model answer')).toBeVisible(); // revealed only after the attempt
  await cont(page);

  // 8–9. Revision + mini exam
  await firstOptionEach(page);
  await check(page);
  await cont(page);
  await firstOptionEach(page);
  await check(page);
  await cont(page, /Finish today/);
  await expect(page.getByRole('heading', { name: 'Day 1 complete' })).toBeVisible();

  // Dashboard
  await page.getByRole('link', { name: 'Back to dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Hello Ann!' })).toBeVisible();
  await expect(page.getByText('9/9')).toBeVisible();
  await noHorizontalOverflow(page);

  // Logout → login: progress persists
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/welcome/);
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secret-pass-1');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('9/9')).toBeVisible();
  await expect(page.getByText(/1 🔥/)).toBeVisible();

  // Session survives a full reload (refresh cookie)
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hello Ann!' })).toBeVisible();

  // Progress shows tracked mistakes; revision has due items scheduled
  await page.goto('/progress');
  await expect(page.getByText('am / is / are')).toBeVisible();

  // Exam: 100 marks, report
  await page.goto('/exams');
  await page.getByRole('button', { name: /Lesson exam/ }).click();
  await expect(page).toHaveURL(/exams\/.+/);
  await expect(page.getByText(/Question 1 of/)).toBeVisible();
  const total = Number((await page.getByText(/Question 1 of \d+/).textContent())!.match(/of (\d+)/)![1]);
  for (let i = 0; i < total; i++) {
    await expect(page.getByText(new RegExp(`Question ${i + 1} of`))).toBeVisible();
    const radios = page.getByRole('radio');
    if (await radios.count()) await radios.first().click(); else await page.getByLabel(/Type the answer|Your answer/).fill('children');
    if (i < total - 1) await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await page.getByRole('button', { name: /Submit exam/ }).click();
  await expect(page.getByText('Total score (out of 100)')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Next practice plan' })).toBeVisible();
});

test('module hubs work independently: Write and Speak practice', async ({ page }) => {
  await register(page, 'Ravi');
  await onboard(page);
  await page.goto('/write');
  await page.getByRole('link', { name: /My family/ }).click();
  await page.getByLabel('Write your answer').fill('I has a small family. My father are a farmer.');
  await page.getByRole('button', { name: 'Check my writing' }).click();
  await expect(page.getByText('I have a small family.').first()).toBeVisible();

  await page.goto('/speak');
  await page.getByRole('link', { name: /Greetings and introduction/ }).click();
  await page.getByLabel('Your answer').fill('I am fine, thank you.');
  await page.getByRole('button', { name: 'Send answer' }).click();
  await expect(page.getByRole('button', { name: 'Next question' })).toBeVisible();

  await page.goto('/technical');
  await expect(page.getByText(/Unlocks at Level 2/).first()).toBeVisible();

  await page.goto('/vocabulary');
  await page.getByRole('link', { name: /Fruits/ }).click();
  await page.getByRole('button', { name: 'Practise' }).first().click();
  await page.getByRole('button', { name: 'I said it 3 times' }).click();
  await page.getByLabel('Spelling').fill('apple');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('Correct!')).toBeVisible();
});
