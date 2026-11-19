import { test, expect } from '@playwright/test';
import { register, onboard, noHorizontalOverflow } from './helpers';

const PAGES = ['/', '/daily', '/learn', '/read', '/write', '/speak', '/lesson', '/lesson/is-am-are', '/vocabulary', '/vocabulary/greetings', '/pronunciation', '/technical', '/exams', '/progress', '/revision', '/settings', '/speak/chat'];

test('every page renders without horizontal overflow or broken navigation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/welcome');
  await noHorizontalOverflow(page);
  await register(page);
  await onboard(page);
  for (const p of PAGES) {
    await page.goto(p);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await noHorizontalOverflow(page);
  }
  // narrowest supported phone width
  await page.setViewportSize({ width: 320, height: 640 });
  for (const p of ['/', '/daily', '/settings', '/exams']) { await page.goto(p); await noHorizontalOverflow(page); }
  expect(errors).toEqual([]);
});

test('touch targets in the tab bar are at least 44px', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await register(page); await onboard(page);
  await page.goto('/');
  await expect(page.locator('nav.tabbar a')).toHaveCount(5);
  const sizes = await page.locator('nav.tabbar a').evaluateAll(els => els.map(e => e.getBoundingClientRect().height));
  expect(sizes.length).toBe(5);
  for (const h of sizes) expect(h).toBeGreaterThanOrEqual(44);
});
