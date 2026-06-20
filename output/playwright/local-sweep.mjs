import { chromium } from './netflix-audit/node_modules/playwright/index.mjs';
import fs from 'fs/promises';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
const page = await context.newPage();
const tabs = ['start-here','requirements','architecture','playback','cdn','encoding','security','models','tradeoffs','capacity','failures','quiz','mock-interview','cheat-sheet'];
await fs.mkdir('output/playwright/local-sweep', { recursive: true });
for (const tab of tabs) {
  await page.goto(`http://localhost:3000/system-design/netflix/${tab}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `output/playwright/local-sweep/${tab}.png` });
}
await browser.close();
