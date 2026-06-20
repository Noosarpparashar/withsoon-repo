import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const configs = {
  tablet: { width: 768, height: 1024 },
  mobileSmall: { width: 360, height: 740 },
};
for (const [name, viewport] of Object.entries(configs)) {
  const context = await browser.newContext({ viewport, colorScheme: 'dark' });
  const page = await context.newPage();
  for (const slug of ['architecture','quiz','mock-interview','cheat-sheet']) {
    await page.goto(`https://withsoon.com/system-design/netflix/${slug}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `output/playwright/netflix-audit/${slug}-${name}.png` });
    const info = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      text: document.body.innerText.slice(0,300)
    }));
    console.log(JSON.stringify({ name, slug, overflow: info.scrollWidth > info.innerWidth, scrollWidth: info.scrollWidth, innerWidth: info.innerWidth }));
  }
  await context.close();
}
await browser.close();
