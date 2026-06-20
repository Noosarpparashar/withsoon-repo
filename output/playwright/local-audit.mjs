import { chromium } from './netflix-audit/node_modules/playwright/index.mjs';
import fs from 'fs/promises';
const out = 'output/playwright/local-audit';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const base = 'http://localhost:3000/system-design/netflix';
async function shot(name, fullPage=false){ const p=`${out}/${name}`; await page.screenshot({path:p, fullPage}); return p; }

await page.goto(`${base}/architecture`, { waitUntil: 'networkidle' });
await shot('arch-dark.png');
await page.getByRole('button', { name:/toggle theme/i }).click();
await page.waitForTimeout(300);
await shot('arch-light.png');
await page.getByRole('button', { name:/Catalog Service/i }).first().click({ force: true }).catch(()=>{});
await page.waitForTimeout(300);
await shot('arch-light-catalog.png');

await page.goto(`${base}/start-here`, { waitUntil: 'networkidle' });
await shot('start-here.png');
await page.getByRole('button', { name:/Requirements/ }).first().hover();
await shot('start-here-hover-requirements.png');
await page.getByRole('button', { name:/Requirements/ }).first().click();
await page.waitForLoadState('networkidle');
await shot('requirements.png');

await page.goto(`${base}/models`, { waitUntil: 'networkidle' });
await shot('models-full.png', true);
await page.getByRole('button', { name:/Session & DRM License/i }).click().catch(()=>{});
await page.waitForTimeout(300);
await shot('models-session-drm.png');

await page.goto(`${base}/security`, { waitUntil: 'networkidle' });
await shot('security-full.png', true);

await page.goto(`${base}/cdn`, { waitUntil: 'networkidle' });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(300);
await shot('cdn-footer.png');

const cursors = await page.goto(`${base}/start-here`, { waitUntil: 'networkidle' }).then(async ()=> page.evaluate(() => {
  const labels = ['Start Here','Requirements','Architecture','Playback','CDN','Encoding','Security','Data Models','Trade-offs','Capacity','Failures','Quiz','Mock Interview','Cheat Sheet'];
  return labels.map(label => {
    const b = Array.from(document.querySelectorAll('button')).find(x => (x.textContent||'').trim() === label);
    return b ? { label, cursor: getComputedStyle(b).cursor } : { label, cursor: null };
  });
}));
console.log(JSON.stringify({ out, cursors }, null, 2));
await browser.close();
