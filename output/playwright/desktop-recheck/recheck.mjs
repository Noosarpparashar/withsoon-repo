import { chromium } from '../netflix-audit/node_modules/playwright/index.mjs';
import fs from 'fs/promises';

const out = 'output/playwright/desktop-recheck';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
const page = await context.newPage();
const results = {};

const save = async (name, fullPage = false) => {
  const path = `${out}/${name}`;
  await page.screenshot({ path, fullPage });
  return path;
};

const contrast = (fg, bg) => {
  const parse = (rgb) => {
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return null;
    return m.slice(1).map(Number).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  };
  const a = parse(fg), b = parse(bg);
  if (!a || !b) return null;
  const l1 = 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  const l2 = 0.2126 * b[0] + 0.7152 * b[1] + 0.0722 * b[2];
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
};

async function goto(slug) {
  await page.goto(`https://withsoon.com/system-design/netflix/${slug}`, { waitUntil: 'networkidle' });
}

await goto('architecture');
results.arch_before = await save('architecture-before.png');

const themeButton = page.getByRole('button', { name: /toggle theme/i }).first();
if (await themeButton.count()) {
  const cls = await page.evaluate(() => document.documentElement.className);
  if (!/light/.test(cls)) {
    await themeButton.click();
    await page.waitForTimeout(300);
  }
}
results.arch_light = await save('architecture-light.png');

const catalogButton = page.getByRole('button', { name: /Catalog Service/i }).first();
await catalogButton.click({ force: true }).catch(() => null);
await page.waitForTimeout(300);
results.arch_catalog = await save('architecture-catalog-selected.png');

results.catalogStyles = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Catalog Service'));
  const panel = Array.from(document.querySelectorAll('h1,h2,h3,p,div,span')).find(el => (el.textContent || '').includes('Serves content metadata'));
  const tab = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').trim() === 'Architecture');
  const flows = Array.from(document.querySelectorAll('button')).filter(b => ['User clicks Play','Content Upload','Payment Fails','Search Request','User Registers','Multi-Region Failover','GDPR Deletion'].includes((b.textContent || '').trim())).map(b => {
    const cs = getComputedStyle(b);
    return { text: b.textContent.trim(), bg: cs.backgroundColor, color: cs.color, border: cs.borderColor, cursor: cs.cursor, height: Math.round(b.getBoundingClientRect().height) };
  });
  const pick = (el) => el ? (() => { const cs = getComputedStyle(el); return { text: (el.textContent || '').trim().slice(0,80), color: cs.color, bg: cs.backgroundColor, border: cs.borderColor, cursor: cs.cursor, fontSize: cs.fontSize, lineHeight: cs.lineHeight, h: Math.round(el.getBoundingClientRect().height), w: Math.round(el.getBoundingClientRect().width) }; })() : null;
  return { button: pick(btn), panel: pick(panel), tab: pick(tab), flows };
});
results.catalogContrast = {
  nodeTextOnNode: contrast(results.catalogStyles.button?.color || '', results.catalogStyles.button?.bg || ''),
  panelTextOnPanel: contrast(results.catalogStyles.panel?.color || '', results.catalogStyles.panel?.bg || ''),
};

await goto('start-here');
results.start_here = await save('start-here.png');
results.startCursors = await page.evaluate(() => {
  const labels = ['Start Here','Requirements','Architecture','Playback','CDN','Encoding','Security','Data Models','Trade-offs','Capacity','Failures'];
  return labels.map(label => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').trim() === label);
    if (!btn) return { label, found: false };
    const cs = getComputedStyle(btn);
    return { label, found: true, cursor: cs.cursor, height: Math.round(btn.getBoundingClientRect().height) };
  });
});

const reqBtn = page.getByRole('button', { name: /^Requirements$/ }).first();
await reqBtn.hover();
results.start_hover = await save('start-here-hover-requirements.png');
await reqBtn.click();
results.after_req = await save('requirements-after-click.png');
results.transition = await page.evaluate(() => {
  const candidates = Array.from(document.querySelectorAll('div')).map(el => {
    const style = el.getAttribute('style') || '';
    return { style, text: (el.textContent || '').trim().slice(0, 60) };
  }).filter(x => /opacity/.test(x.style) || /transition/.test(x.style));
  return candidates.slice(0, 10);
});

await goto('models');
results.models = await save('models.png', true);
const firstLeftButton = page.locator('main button').nth(20);
await firstLeftButton.click({ force: true }).catch(() => null);
await page.waitForTimeout(300);
results.models_selected = await save('models-selected.png');
results.modelsStyles = await page.evaluate(() => {
  const tableish = Array.from(document.querySelectorAll('div,p,span')).filter(el => /(partition key|sort key|gsi|schema|column|watch_progress|profile_id|title_id)/i.test(el.textContent || '')).slice(0, 12).map(el => {
    const cs = getComputedStyle(el);
    return { text: (el.textContent || '').trim().slice(0,120), color: cs.color, bg: cs.backgroundColor, fontSize: cs.fontSize, letterSpacing: cs.letterSpacing, display: cs.display, justifyContent: cs.justifyContent };
  });
  return tableish;
});

await goto('security');
results.security = await save('security.png', true);
results.security_top = await save('security-top.png');

await goto('cdn');
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(500);
results.cdn_footer = await save('cdn-footer-bottom.png');
results.footerSpacing = await page.evaluate(() => {
  const footer = document.querySelector('footer');
  const prev = footer?.previousElementSibling;
  if (!footer || !prev) return null;
  const f = footer.getBoundingClientRect();
  const p = prev.getBoundingClientRect();
  return { gap: Math.round(f.top - p.bottom), footerBg: getComputedStyle(footer).backgroundColor, prevBg: getComputedStyle(prev).backgroundColor };
});

await goto('playback');
results.playback = await save('playback.png', true);

console.log(JSON.stringify(results, null, 2));
await browser.close();
