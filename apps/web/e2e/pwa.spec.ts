import { test, expect } from '@playwright/test';

test('manifest, icons and iOS meta are present', async ({ page, request }) => {
  const m = await (await request.get('/manifest.webmanifest')).json();
  expect(m.display).toBe('standalone');
  expect(m.icons.some((i: any) => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true);
  expect((await request.get('/icons/apple-touch-icon.png')).ok()).toBe(true);
  await page.goto('/welcome');
  await expect(page.locator('meta[name=apple-mobile-web-app-capable]')).toHaveAttribute('content', 'yes');
  await expect(page.locator('meta[name=viewport]')).toHaveAttribute('content', /viewport-fit=cover/);
});

test('service worker caches the app shell and it opens offline', async ({ page, context }) => {
  await page.goto('/welcome');
  await page.waitForFunction(async () => !!(await navigator.serviceWorker?.getRegistration())?.active, null, { timeout: 60_000 });
  // let ngsw finish prefetching
  await page.waitForFunction(async () => (await caches.keys()).some(k => k.includes('ngsw') && k.includes('app')), null, { timeout: 30_000 });
  await page.reload();
  await context.setOffline(true);
  await page.goto('/welcome');
  await expect(page.getByRole('heading', { name: /Empower/ })).toBeVisible();
  await expect(page.getByText(/You're offline/)).toBeVisible();
  // personal API data is never served from the SW cache
  const cached = await page.evaluate(async () => {
    const out: string[] = [];
    for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) out.push(r.url);
    return out;
  });
  expect(cached.filter(u => /\/api\/v1\/(me|dashboard|daily|progress|auth)/.test(u))).toEqual([]);
  await context.setOffline(false);
});
