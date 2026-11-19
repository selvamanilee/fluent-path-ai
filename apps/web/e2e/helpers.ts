import { Page, expect } from '@playwright/test';

export const uniqueEmail = () => `e2e${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;

export async function register(page: Page, name = 'Ann') {
  const email = uniqueEmail();
  await page.goto('/welcome');
  await page.getByRole('link', { name: 'Start learning' }).click();
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secret-pass-1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/onboarding/);
  return email;
}

export async function onboard(page: Page) {
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Start Day 1' }).click();
  await expect(page).toHaveURL(/daily/);
}

export async function noHorizontalOverflow(page: Page) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  expect(o.sw, `page is ${o.sw}px wide in a ${o.w}px viewport`).toBeLessThanOrEqual(o.w);
}
