import { chromium } from 'playwright';
import fs from 'fs/promises';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
const page = await context.newPage();
const shots = [
  ['architecture','architecture/mobile-above-fold.png'],
  ['quiz','quiz/mobile-answer-reveal.png'],
  ['mock-interview','mock/mobile-mock-interview.png'],
  ['cheat-sheet','cheatsheet/mobile-cheat-sheet.png'],
  ['start-here','pages/mobile-start-here.png'],
];
for (const [slug, file] of shots) {
  await page.goto(`https://withsoon.com/system-design/netflix/${slug}`, { waitUntil: 'networkidle' });
  if (slug === 'quiz') {
    const flip = page.getByText(/Click to reveal answer/i).first();
    if (await flip.count()) await flip.click().catch(()=>{});
  }
  await fs.mkdir(`output/playwright/netflix-audit/${file}`.split('/').slice(0,-1).join('/'), { recursive: true });
  await page.screenshot({ path: `output/playwright/netflix-audit/${file}` });
}
await browser.close();
