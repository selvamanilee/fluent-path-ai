// Renders the FluentPath brand mark to PNG icons (any + maskable + apple-touch) with Playwright.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { fileURLToPath } from 'node:url';
const out = fileURLToPath(new URL('../public/icons/', import.meta.url));
const mark = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#141414"/>
<g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
<rect x="96" y="176" width="92" height="240" rx="46" fill="#6E62E5"/><rect x="210" y="96" width="92" height="200" rx="46" fill="#6E62E5"/>
<circle cx="256" cy="370" r="46" fill="#F9D5FB"/><rect x="324" y="136" width="92" height="280" rx="46" fill="#6E62E5"/><circle cx="370" cy="96" r="0" fill="#F9D5FB"/></g></svg>`;
const b = await chromium.launch();
const p = await b.newPage();
async function render(size, pad, name) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<style>html,body{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${mark(pad)}`);
  await p.screenshot({ path: out + name, omitBackground: false });
}
for (const s of [72, 96, 128, 144, 152, 192, 384, 512]) await render(s, 24, `icon-${s}x${s}.png`);
await render(512, 96, 'maskable-512x512.png');
await render(180, 28, 'apple-touch-icon.png');
await render(32, 0, '../favicon.png');
await b.close();
console.log('icons written');
