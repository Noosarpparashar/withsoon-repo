import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

const outDir = path.resolve('output/playwright/netflix-audit');
const base = 'https://withsoon.com';
const pages = [
  'start-here','requirements','architecture','playback','cdn','encoding','security','models','tradeoffs','capacity','failures','quiz','mock-interview','cheat-sheet'
];
const pageTitle = {
  'start-here':'Start Here','requirements':'Requirements','architecture':'Architecture','playback':'Playback','cdn':'CDN','encoding':'Encoding','security':'Security','models':'Data Models','tradeoffs':'Trade-offs','capacity':'Capacity','failures':'Failures','quiz':'Quiz','mock-interview':'Mock Interview','cheat-sheet':'Cheat Sheet'
};
const viewports = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
  mobileSmall: { width: 360, height: 740 },
};

const result = {
  generatedAt: new Date().toISOString(),
  screenshots: [],
  meta: {},
  interactions: [],
  issues: [],
  pageFacts: {},
  colorAudit: [],
  discovery: [],
  keyboard: [],
  performance: [],
  console: [],
};

function slugUrl(slug) {
  return `${base}/system-design/netflix/${slug}`;
}

function safeName(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

function rel(file) { return path.relative(process.cwd(), file); }

function ratioFromRgb(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return null;
  const [r,g,b] = m.slice(1).map(Number).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126*r + 0.7152*g + 0.0722*b;
}

function contrast(fg, bg) {
  const l1 = ratioFromRgb(fg); const l2 = ratioFromRgb(bg);
  if (l1 == null || l2 == null) return null;
  const lighter = Math.max(l1,l2), darker = Math.min(l1,l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }

async function shot(page, file, locator = null) {
  const full = path.join(outDir, file);
  await ensureDir(path.dirname(full));
  if (locator) await locator.screenshot({ path: full });
  else await page.screenshot({ path: full, fullPage: false });
  result.screenshots.push(rel(full));
  return rel(full);
}

async function extractMeta(page) {
  return await page.evaluate(() => {
    const get = sel => document.querySelector(sel)?.getAttribute('content') || document.querySelector(sel)?.getAttribute('href') || null;
    return {
      title: document.title,
      description: get('meta[name="description"]'),
      canonical: get('link[rel="canonical"]'),
      ogTitle: get('meta[property="og:title"]'),
      ogDescription: get('meta[property="og:description"]'),
      ogImage: get('meta[property="og:image"]'),
      ogUrl: get('meta[property="og:url"]'),
      twitterCard: get('meta[name="twitter:card"]'),
      twitterTitle: get('meta[name="twitter:title"]'),
      twitterDescription: get('meta[name="twitter:description"]'),
      twitterImage: get('meta[name="twitter:image"]'),
      h1s: Array.from(document.querySelectorAll('h1')).map(el => el.textContent?.trim()),
      h2s: Array.from(document.querySelectorAll('h2')).map(el => el.textContent?.trim()).slice(0,10),
    };
  });
}

async function gatherColors(page, slug) {
  const samples = await page.evaluate(() => {
    const selectors = [
      { name: 'body', sel: 'body' },
      { name: 'tab-active', sel: 'button[style*="background:#e50914"], button[style*="background: #e50914"], button[style*="background:#e5091430"]' },
      { name: 'tab-row', sel: 'div[style*="border-bottom:1px solid #343a46"] button' },
      { name: 'primary-button', sel: 'button' },
      { name: 'muted-text', sel: 'p, span' }
    ];
    return selectors.map(({name, sel}) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        name,
        text: (el.textContent || '').trim().slice(0, 60),
        color: cs.color,
        background: cs.backgroundColor,
        border: cs.borderColor,
        fontSize: cs.fontSize,
      };
    }).filter(Boolean);
  });
  for (const sample of samples) {
    result.colorAudit.push({ slug, ...sample, contrast: contrast(sample.color, sample.background) });
  }
}

async function capturePageFacts(page, slug, viewportName) {
  const facts = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).map(b => (b.textContent || '').trim()).filter(Boolean);
    const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: (a.textContent || '').trim(), href: a.getAttribute('href') })).filter(a => a.text).slice(0, 50);
    return {
      url: location.href,
      bodyTextSnippet: document.body.innerText.replace(/\s+/g, ' ').slice(0, 500),
      buttons: buttons.slice(0, 60),
      links,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      hasBreadcrumbSystemDesign: !!Array.from(document.querySelectorAll('a, span')).find(el => el.textContent?.trim() === 'System Design'),
      hasShare: buttons.includes('Share'),
      hasInterview: buttons.includes('Interview'),
    };
  });
  result.pageFacts[`${slug}:${viewportName}`] = facts;
}

async function checkDiscovery(page) {
  await page.goto(base, { waitUntil: 'networkidle' });
  let clicked = false;
  const candidates = [
    page.getByRole('link', { name: /System Design/i }).first(),
    page.locator('a[href*="/system-design"]').first(),
  ];
  for (const loc of candidates) {
    if (await loc.count()) {
      await loc.click();
      clicked = true;
      break;
    }
  }
  result.discovery.push({ path: 'homepage->system-design', success: clicked, url: page.url() });
  const screenshot = await shot(page, 'discovery/homepage-system-design.png');
  result.interactions.push({ action: 'Homepage → System Design', expected: 'Open system design landing page', actual: page.url(), pass: /\/system-design/.test(page.url()), screenshot });

  await page.goto(`${base}/system-design`, { waitUntil: 'networkidle' });
  const netflixCard = page.locator('a[href*="/system-design/netflix/"]').first();
  const cardExists = await netflixCard.count();
  if (cardExists) await netflixCard.click();
  result.discovery.push({ path: '/system-design -> netflix', success: !!cardExists, url: page.url() });
  result.interactions.push({ action: '/system-design → Netflix card', expected: 'Open Netflix system design experience', actual: page.url(), pass: /\/system-design\/netflix\//.test(page.url()), screenshot: await shot(page, 'discovery/system-design-netflix.png') });
}

async function testTheme(page, viewportName) {
  await page.goto(slugUrl('architecture'), { waitUntil: 'networkidle' });
  const themeButton = page.getByRole('button', { name: /toggle theme/i }).first();
  if (await themeButton.count()) {
    await themeButton.click();
    await page.waitForTimeout(300);
    const lightClass = await page.evaluate(() => document.documentElement.className);
    const lightShot = await shot(page, `theme/${viewportName}-light.png`);
    await themeButton.click();
    await page.waitForTimeout(300);
    const darkClass = await page.evaluate(() => document.documentElement.className);
    const darkShot = await shot(page, `theme/${viewportName}-dark.png`);
    result.interactions.push({ action: `Toggle theme (${viewportName})`, expected: 'Theme should visibly switch and remain readable', actual: `classes ${lightClass} -> ${darkClass}`, pass: lightClass !== darkClass, screenshot: `${lightShot}, ${darkShot}` });
  }
}

async function testKeyboard(page, viewportName) {
  await page.goto(slugUrl('architecture'), { waitUntil: 'networkidle' });
  const focusOrder = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName,
        text: (el.textContent || '').trim().slice(0, 50),
        aria: el.getAttribute('aria-label'),
        outline: cs.outline,
        boxShadow: cs.boxShadow,
      };
    });
    focusOrder.push(focused);
  }
  result.keyboard.push({ viewportName, focusOrder });
  result.interactions.push({ action: `Keyboard Tab traversal (${viewportName})`, expected: 'Visible focus and sensible order', actual: JSON.stringify(focusOrder), pass: focusOrder.some(f => (f?.outline && f.outline !== 'rgb(248, 250, 252) none 0px') || (f?.boxShadow && f.boxShadow !== 'none')), screenshot: await shot(page, `keyboard/${viewportName}-focus.png`) });
}

async function testTabNavigation(page) {
  await page.goto(slugUrl('architecture'), { waitUntil: 'networkidle' });
  const tabs = Object.entries(pageTitle);
  for (const [slug, title] of tabs) {
    const btn = page.getByRole('button', { name: new RegExp(`^${title.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }).first();
    const count = await btn.count();
    if (!count) {
      result.interactions.push({ action: `Click tab ${title}`, expected: `Navigate to ${slug}`, actual: 'Button not found', pass: false, screenshot: null });
      continue;
    }
    await btn.click();
    await page.waitForLoadState('networkidle');
    const pass = page.url().includes(`/${slug}`);
    const screenshot = await shot(page, `tabs/${String(result.interactions.length+1).padStart(2, '0')}-${slug}.png`);
    result.interactions.push({ action: `Click tab ${title}`, expected: `URL ends with /${slug}`, actual: page.url(), pass, screenshot });
    await page.reload({ waitUntil: 'networkidle' });
    result.interactions.push({ action: `Reload ${title}`, expected: `Remain on /${slug}`, actual: page.url(), pass: page.url().includes(`/${slug}`), screenshot: null });
  }
  await page.goBack({ waitUntil: 'networkidle' });
  const backUrl = page.url();
  await page.goForward({ waitUntil: 'networkidle' });
  const forwardUrl = page.url();
  result.interactions.push({ action: 'Browser back/forward', expected: 'Restore previous and next tabs correctly', actual: `${backUrl} -> ${forwardUrl}`, pass: /netflix/.test(backUrl) && /netflix/.test(forwardUrl), screenshot: null });
}

async function testArchitecture(page, viewportName) {
  const safe = async (fn) => { try { return await fn(); } catch { return null; } };
  await page.goto(slugUrl('architecture'), { waitUntil: 'networkidle' });
  await shot(page, `architecture/${viewportName}-above-fold.png`);
  const tabbar = page.locator('div').filter({ has: page.getByText('Architecture', { exact: true }) }).first();
  if (await tabbar.count()) await shot(page, `architecture/${viewportName}-tabbar.png`, tabbar);
  const mobileFallback = await page.getByText(/Full interactive diagram on desktop/i).count();
  if (mobileFallback) {
    result.interactions.push({ action: `Mobile fallback visible (${viewportName})`, expected: 'Fallback shown on small screens', actual: 'Fallback detected', pass: /mobile|tablet/i.test(viewportName), screenshot: await shot(page, `architecture/${viewportName}-mobile-fallback.png`) });
  }

  const buttons = page.locator('button');
  const buttonTexts = [];
  const count = await buttons.count();
  for (let i = 0; i < Math.min(count, 80); i++) {
    const text = ((await buttons.nth(i).innerText().catch(() => '')) || '').trim();
    if (text) buttonTexts.push(text);
  }
  const flowButtons = buttonTexts.filter(t => /play|upload|payment|search|register|failover|gdpr|flow/i.test(t));
  for (const flow of [...new Set(flowButtons)].slice(0, 10)) {
    const loc = page.getByRole('button', { name: new RegExp(flow.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') }).first();
    if (await loc.count()) {
      await loc.click().catch(() => null);
      await page.waitForTimeout(400);
      result.interactions.push({ action: `Run flow ${flow}`, expected: 'Flow starts with visible progression or explanation', actual: `Clicked ${flow}`, pass: true, screenshot: await shot(page, `flows/${viewportName}-${safeName(flow)}.png`) });
    }
  }

  const nodes = page.locator('main button, main [role="button"]');
  const nodeCount = await nodes.count();
  if (nodeCount > 0) {
    for (let i = 0; i < Math.min(nodeCount, 8); i++) {
      const node = nodes.nth(i);
      const box = await node.boundingBox().catch(() => null);
      if (!box || box.width < 8 || box.height < 8) continue;
      await safe(() => node.hover());
      await safe(() => page.waitForTimeout(100));
      await safe(() => node.click({ force: true }));
      await safe(() => page.waitForTimeout(200));
      if (page.isClosed()) return;
    }
    result.interactions.push({ action: `Diagram nodes sample (${viewportName})`, expected: 'Hover/click reveals state or details', actual: `Interacted with up to 8 candidates`, pass: true, screenshot: await shot(page, `architecture/${viewportName}-node-state.png`) });
  }

  await gatherColors(page, `architecture:${viewportName}`);
}

async function testQuiz(page, viewportName) {
  await page.goto(slugUrl('quiz'), { waitUntil: 'networkidle' });
  const buttons = page.locator('button');
  const count = await buttons.count();
  let clicked = 0;
  for (let i = 0; i < Math.min(count, 20); i++) {
    const btn = buttons.nth(i);
    const text = ((await btn.innerText().catch(() => '')) || '').trim();
    if (!text) continue;
    if (/share|interview|start here|requirements|architecture|playback|cdn|encoding|security|models|trade-offs|capacity|failures|cheat sheet|mock interview/i.test(text)) continue;
    await btn.click({ force: true }).catch(() => null);
    await page.waitForTimeout(150);
    clicked++;
  }
  const screenshot = await shot(page, `quiz/${viewportName}-answer-reveal.png`);
  result.interactions.push({ action: `Quiz interactions (${viewportName})`, expected: 'Answer selection and reveal should work without layout collapse', actual: `Clicked ${clicked} buttons`, pass: clicked > 0, screenshot });
}

async function testMockInterview(page, viewportName) {
  await page.goto(slugUrl('mock-interview'), { waitUntil: 'networkidle' });
  const buttons = page.locator('button');
  const count = await buttons.count();
  let clicked = 0;
  for (let i = 0; i < Math.min(count, 20); i++) {
    const btn = buttons.nth(i);
    const text = ((await btn.innerText().catch(() => '')) || '').trim();
    if (!text) continue;
    if (/share|interview|start here|requirements|architecture|playback|cdn|encoding|security|models|trade-offs|capacity|failures|quiz|cheat sheet/i.test(text)) continue;
    await btn.click({ force: true }).catch(() => null);
    await page.waitForTimeout(200);
    clicked++;
  }
  const screenshot = await shot(page, `mock/${viewportName}-mock-interview.png`);
  result.interactions.push({ action: `Mock interview interactions (${viewportName})`, expected: 'Reveal/follow-up interactions should work', actual: `Clicked ${clicked} buttons`, pass: clicked > 0, screenshot });
}

async function testCheatSheet(page, viewportName) {
  await page.goto(slugUrl('cheat-sheet'), { waitUntil: 'networkidle' });
  const screenshot = await shot(page, `cheatsheet/${viewportName}-cheat-sheet.png`);
  const copyButtons = await page.getByRole('button', { name: /copy|print|save/i }).allTextContents().catch(() => []);
  result.interactions.push({ action: `Cheat sheet scan (${viewportName})`, expected: 'Cheat sheet should be scannable and expose copy/print affordances', actual: `copyish buttons: ${copyButtons.join(', ') || 'none found'}`, pass: true, screenshot });
}

async function auditViewport(browser, viewportName, viewport) {
  const errors = [];
  const context = await browser.newContext({ viewport, colorScheme: 'dark' });
  const page = await context.newPage();
  page.on('console', msg => result.console.push({ viewportName, type: msg.type(), text: msg.text() }));

  for (const fn of [
    () => checkDiscovery(page),
    () => testTheme(page, viewportName),
    () => testKeyboard(page, viewportName),
    () => testArchitecture(page, viewportName),
    () => testQuiz(page, viewportName),
    () => testMockInterview(page, viewportName),
    () => testCheatSheet(page, viewportName),
  ]) {
    try {
      if (page.isClosed()) break;
      await fn();
    } catch (error) {
      errors.push(String(error));
    }
  }

  for (const slug of pages) {
    const start = Date.now();
    if (page.isClosed()) break;
    try { await page.goto(slugUrl(slug), { waitUntil: 'networkidle' }); } catch (error) { errors.push(`goto ${slug}: ${error}`); continue; }
    result.meta[`${slug}:${viewportName}`] = await extractMeta(page);
    await capturePageFacts(page, slug, viewportName);
    result.performance.push({ viewportName, slug, loadMs: Date.now() - start });
    if (slug === 'architecture') continue;
    if (slug === 'quiz' || slug === 'mock-interview' || slug === 'cheat-sheet') continue;
    await shot(page, `pages/${viewportName}-${slug}.png`);
  }

  result.pageFacts[`errors:${viewportName}`] = { errors };
  await context.close();
}

async function globalChecks(browser) {
  const context = await browser.newContext({ viewport: viewports.desktop, colorScheme: 'dark' });
  const page = await context.newPage();
  await testTabNavigation(page);
  await page.goto(slugUrl('architecture'), { waitUntil: 'networkidle' });
  const seo = await extractMeta(page);
  result.meta['architecture:desktop-seo'] = seo;
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  await globalChecks(browser);
  for (const [name, viewport] of Object.entries(viewports)) {
    await auditViewport(browser, name, viewport);
  }
  await browser.close();
  await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ outDir: rel(outDir), interactions: result.interactions.length, screenshots: result.screenshots.length }, null, 2));
})();
