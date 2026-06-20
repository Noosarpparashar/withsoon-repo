import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'fs/promises';
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({ viewport:{width:1280,height:800}, colorScheme:'dark' });
await page.goto('https://withsoon.com/system-design/netflix/architecture',{waitUntil:'networkidle'});
const flows = ['User clicks Play','Content Upload','Payment Fails','Search Request','User Registers','Multi-Region Failover','GDPR Deletion'];
for (const flow of flows) {
  const btn = page.getByRole('button', { name: new RegExp(`^${flow.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}$`) }).first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(300);
    await fs.mkdir('output/playwright/netflix-audit/flows-check', {recursive:true});
    await page.screenshot({ path: `output/playwright/netflix-audit/flows-check/${flow.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png` });
    const text = await page.locator('body').innerText();
    console.log(JSON.stringify({flow, found:true, snippet:text.slice(0,600)}));
  } else {
    console.log(JSON.stringify({flow, found:false}));
  }
}
await browser.close();
