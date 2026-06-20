import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};
const base = 'https://withsoon.com/system-design/netflix';
const results = {};
for (const [name, viewport] of Object.entries(viewports)) {
  const context = await browser.newContext({ viewport, colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto(`${base}/architecture`, { waitUntil: 'networkidle' });
  results[name] = {};
  results[name].arch = await page.evaluate(() => {
    const sample = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { sel, text: (el.textContent || '').trim().slice(0,50), color: cs.color, bg: cs.backgroundColor, border: cs.borderColor, fontSize: cs.fontSize, lineHeight: cs.lineHeight };
    };
    return {
      title: document.title,
      h1s: Array.from(document.querySelectorAll('h1')).map(x => x.textContent.trim()),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      samples: [
        sample('body'),
        sample('header'),
        sample('main button'),
        sample('p'),
        sample('span'),
        sample('button[aria-label="Toggle theme"]'),
      ],
      tabTexts: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean).slice(0,40),
      hasFallback: !!document.body.innerText.match(/Full interactive diagram on desktop/i),
      copyButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => /copy|print|download/i.test(t)),
    };
  });
  await page.goto(`${base}/quiz`, { waitUntil: 'networkidle' });
  results[name].quiz = await page.evaluate(() => ({
    title: document.title,
    text: document.body.innerText.slice(0,1000),
    buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean).slice(0,50),
  }));
  await page.goto(`${base}/mock-interview`, { waitUntil: 'networkidle' });
  await page.click('button:text("?")').catch(()=>{});
  results[name].mock = await page.evaluate(() => ({
    text: document.body.innerText.slice(0,1200),
    buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean).slice(0,50),
    modalVisible: !!Array.from(document.querySelectorAll('div')).find(d => d.textContent?.includes('Keyboard Shortcuts')),
  }));
  await page.goto(`${base}/cheat-sheet`, { waitUntil: 'networkidle' });
  results[name].cheat = await page.evaluate(() => ({
    title: document.title,
    buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean).slice(0,50),
    text: document.body.innerText.slice(0,1500),
  }));
  await context.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
