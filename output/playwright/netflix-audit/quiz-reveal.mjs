import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
for (const [name, viewport] of Object.entries({ desktop:{width:1440,height:900}, mobile:{width:390,height:844} })) {
  const context = await browser.newContext({ viewport, colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto('https://withsoon.com/system-design/netflix/quiz', { waitUntil:'networkidle' });
  const card = page.locator('text=Click to reveal answer').first();
  await card.click({ force: true }).catch(()=>{});
  await page.keyboard.press('Space').catch(()=>{});
  await page.waitForTimeout(300);
  await page.screenshot({ path: `output/playwright/netflix-audit/quiz/${name}-answer-revealed-fixed.png` });
  await context.close();
}
await browser.close();
