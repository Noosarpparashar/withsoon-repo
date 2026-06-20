import { chromium } from '../../../node_modules/playwright/index.mjs';
import fs from 'fs/promises';
const out='output/playwright/desktop-audit-wave3';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:980},colorScheme:'dark'});
const page=await context.newPage();
const issues=[];
const shots=[];
const base='http://localhost:3000/system-design/netflix';
async function goto(slug, wait='networkidle'){await page.goto(`${base}/${slug}`,{waitUntil:wait});}
async function shot(name, fullPage=false){const path=`${out}/${name}`; await page.screenshot({path,fullPage}); shots.push(path); return path;}
function esc(text){return text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
page.on('console', msg=>{ if(msg.type()==='error') issues.push({severity:'P1',area:'console',msg:msg.text(),url:page.url()});});
page.on('pageerror', err=>issues.push({severity:'P0',area:'pageerror',msg:String(err),url:page.url()}));

await goto('quiz');
await page.getByRole('button', {name:/Show answer/i}).first().click().catch(()=>null);
const reviewBtn=page.getByRole('button',{name:/Open .* →/i}).first();
const reviewVisible=await reviewBtn.isVisible().catch(()=>false);
if(reviewVisible){
  const label=(await reviewBtn.innerText()).trim();
  await reviewBtn.click();
  await page.waitForLoadState('networkidle');
  if(!/system-design\/netflix\//.test(page.url())) issues.push({severity:'P1',area:'quiz',msg:`Review button did not navigate: ${label}`});
  await shot('quiz-review-nav.png');
} else {
  issues.push({severity:'P2',area:'quiz',msg:'Review navigation button not visible after answer reveal'});
}

await goto('mock-interview');
await page.getByRole('button',{name:/Start Mock Interview/i}).click();
await page.waitForTimeout(800);
const q1=await page.locator('[role="timer"]').first().isVisible().catch(()=>false);
if(!q1) issues.push({severity:'P1',area:'mock-interview',msg:'Interview timer not visible after starting'});
await page.getByRole('button',{name:/Show hint/i}).click().catch(()=>issues.push({severity:'P2',area:'mock-interview',msg:'Show hint button not clickable'}));
const pushbackCandidates=[/What assumptions are you making\?/i,/But what problem specifically\?/i,/Who specifically uses this data\?/i];
let pushbackClicked=false;
for (const re of pushbackCandidates){
  const btn=page.getByRole('button',{name:re}).first();
  if(await btn.count()) { await btn.click().catch(()=>null); pushbackClicked=true; break; }
}
if(!pushbackClicked) issues.push({severity:'P2',area:'mock-interview',msg:'No pushback prompt was clickable on first question'});
const ratingCandidates=[/⭐ Nailed it/i,/⚡ Okay/i,/✗ Missed it/i,/Okay/i,/Nailed it/i,/Missed it/i];
let rated=false;
for (const re of ratingCandidates){
  const btn=page.getByRole('button',{name:re}).first();
  if(await btn.count()) { await btn.click().catch(()=>null); rated=true; break; }
}
if(!rated) issues.push({severity:'P1',area:'mock-interview',msg:'Self-rating controls not found'});
await page.getByRole('button',{name:/Next Question/i}).click().catch(()=>issues.push({severity:'P1',area:'mock-interview',msg:'Next Question button not clickable after rating'}));
await page.waitForTimeout(500);
await shot('mock-interview-q2.png');
const step2Visible=await page.getByText(/Question 2 \/ /i).isVisible().catch(()=>false);
if(!step2Visible) issues.push({severity:'P1',area:'mock-interview',msg:'Next Question did not advance to question 2'});
await page.getByRole('button',{name:/Pause interview timer/i}).click().catch(()=>null);
await page.waitForTimeout(300);
await page.getByRole('button',{name:/Resume interview timer/i}).click().catch(()=>issues.push({severity:'P2',area:'mock-interview',msg:'Pause/resume timer toggle broken'}));

await goto('cheat-sheet');
await shot('cheat-sheet-top.png');
await page.getByRole('button',{name:/Copy cheat sheet as Markdown/i}).click().catch(()=>issues.push({severity:'P1',area:'cheat-sheet',msg:'Copy Markdown button not clickable'}));
await page.waitForTimeout(250);
const copyChanged=await page.getByRole('button',{name:/Copied/i}).count().catch(()=>0);
if(!copyChanged) issues.push({severity:'P2',area:'cheat-sheet',msg:'Copy Markdown lacks success feedback'});
const tocButtons=['Openings','Services','APIs','DBs','Failures','Scale'];
const tocPositions=[];
for (const label of tocButtons){
  const btn=page.getByRole('button',{name:new RegExp(`^${esc(label)}$`,'i')}).first();
  if(await btn.count()){
    await btn.click();
    await page.waitForTimeout(350);
    const top=await page.evaluate(() => Math.round(window.scrollY));
    tocPositions.push({label, top});
    if(top < 80) issues.push({severity:'P2',area:'cheat-sheet',msg:`TOC button ${label} did not scroll meaningfully`});
  }
}
await shot('cheat-sheet-scrolled.png');

await goto('capacity');
await shot('capacity-top.png');
const beforeActive=await page.evaluate(() => {
  const names=['Traffic model','Storage model','Throughput hotspots','Capacity formulae','Failure scenarios'];
  return names.map(name=>{
    const b=Array.from(document.querySelectorAll('button')).find(el => (el.textContent||'').includes(name));
    if(!b) return {name, found:false};
    const cs=getComputedStyle(b);
    return {name, found:true, bg:cs.backgroundColor, color:cs.color, border:cs.borderColor};
  });
});
await page.evaluate(()=>window.scrollTo({top:document.body.scrollHeight*0.6, behavior:'instant'}));
await page.waitForTimeout(500);
await shot('capacity-mid.png');
const afterActive=await page.evaluate(() => {
  const names=['Traffic model','Storage model','Throughput hotspots','Capacity formulae','Failure scenarios'];
  return names.map(name=>{
    const b=Array.from(document.querySelectorAll('button')).find(el => (el.textContent||'').includes(name));
    if(!b) return {name, found:false};
    const cs=getComputedStyle(b);
    return {name, found:true, bg:cs.backgroundColor, color:cs.color, border:cs.borderColor};
  });
});
if(JSON.stringify(beforeActive)===JSON.stringify(afterActive)) issues.push({severity:'P2',area:'capacity',msg:'Sidebar section state did not visibly react to scrolling'});

await goto('tradeoffs');
await shot('tradeoffs-top.png');
const capBtn=page.getByRole('button',{name:/CAP Theorem/i}).first();
await capBtn.click().catch(()=>issues.push({severity:'P2',area:'tradeoffs',msg:'CAP section toggle not clickable'}));
await page.waitForTimeout(300);
await capBtn.click().catch(()=>null);
const dbBtn=page.getByRole('button',{name:/Cassandra/i}).first();
if(await dbBtn.count()){
  await dbBtn.click();
  await page.waitForTimeout(300);
  await shot('tradeoffs-db-open.png');
}

await goto('architecture');
const themeBtn=page.getByRole('button',{name:/toggle theme/i}).first();
if(await themeBtn.count()){
  const cls=await page.evaluate(()=>document.documentElement.className);
  if(!/light/.test(cls)){await themeBtn.click(); await page.waitForTimeout(350);}  
}
const archTargets=['Client Apps','API Gateway','Auth Service','Catalog Service','DRM Service','Search Service'];
for (const name of archTargets){
  const btn=page.getByRole('button',{name:new RegExp(name.replace(/\s+/g,'\\s+'),'i')}).first();
  if(await btn.count()){
    await btn.click({force:true}).catch(()=>issues.push({severity:'P2',area:'architecture',msg:`Could not click ${name}`}));
    await page.waitForTimeout(250);
  }
}
await shot('architecture-light-sweep.png');
if(await themeBtn.count()) { await themeBtn.click(); await page.waitForTimeout(350); }
for (const name of archTargets.slice(0,3)){
  const btn=page.getByRole('button',{name:new RegExp(name.replace(/\s+/g,'\\s+'),'i')}).first();
  if(await btn.count()) await btn.click({force:true}).catch(()=>null);
}
await shot('architecture-dark-sweep.png');

await goto('cdn');
await page.evaluate(()=>window.scrollTo({top:document.body.scrollHeight, behavior:'instant'}));
await page.waitForTimeout(400);
await shot('cdn-footer-bottom.png', true);
const footerGap=await page.evaluate(()=>{
  const footer=document.querySelector('footer');
  if(!footer) return null;
  const prev=footer.previousElementSibling;
  if(!prev) return null;
  const f=footer.getBoundingClientRect();
  const p=prev.getBoundingClientRect();
  return {gap: Math.round(f.top-p.bottom), footerBg:getComputedStyle(footer).backgroundColor, prevBg:getComputedStyle(prev).backgroundColor};
});
if(footerGap && footerGap.gap < 24) issues.push({severity:'P2',area:'footer',msg:`Footer sits too close to content at bottom (gap ${footerGap.gap}px)`});

console.log(JSON.stringify({issues, shots, footerGap, tocPositions, beforeActive, afterActive}, null, 2));
await browser.close();
