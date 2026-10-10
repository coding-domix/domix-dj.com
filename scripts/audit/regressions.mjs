import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(path.resolve('output/playwright/tools/package.json'));
const {chromium}=require('playwright');
const phase=process.argv[2]||'after',base=`http://127.0.0.1:${phase==='before'?4173:4174}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[];
async function ready(page){await page.waitForFunction(()=>!document.documentElement.matches('.page-loading,.page-loader-pending'));}
async function check(name,fn){
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{const detail=await fn(page,context);assert.deepEqual(errors,[]);checks.push({name,passed:true,detail,errors});}
 catch(e){checks.push({name,passed:false,message:e.message,errors});}
 await context.close();console.log(JSON.stringify(checks.at(-1)));
}
await check('Malformed fragment does not throw',async page=>{await page.goto(`${base}/shows.html#%E0%A4%A`);await ready(page);});
await check('Historical partner deep link expands correct show',async page=>{await page.goto(`${base}/shows.html#marchfelder-bank-show`);await ready(page);await page.waitForTimeout(500);assert.equal(await page.locator('#lange-einkaufsnacht-show').getAttribute('hidden'),null);});
await check('All gallery images decode',async page=>{
 await page.goto(`${base}/shows.html`);await ready(page);
 const result=await page.evaluate(async()=>{const sources=[...new Set(Object.values(showGalleries).flatMap(g=>g.images))];const broken=[];for(const src of sources){const image=new Image();image.src=src;try{await image.decode();}catch{broken.push(src);}}return{count:sources.length,broken};});
 assert.deepEqual(result.broken,[]);return result;
});
await check('Native keyboard button activation closes gallery',async page=>{await page.goto(`${base}/shows.html`);await ready(page);await page.locator('[data-gallery]').first().click();await page.locator('.show-lightbox-close').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#show-lightbox').getAttribute('aria-hidden'),'true');});
await check('Visible mobile preview is not blocked by caption',async page=>{await page.setViewportSize({width:390,height:900});await page.goto(`${base}/shows.html`);await ready(page);await page.locator('[data-gallery]').first().click();const before=await page.locator('.show-lightbox-image').getAttribute('src');await page.locator('.show-lightbox-preview').first().click({position:{x:100,y:20},timeout:2500});assert.notEqual(await page.locator('.show-lightbox-image').getAttribute('src'),before);});
await check('Rapid audio replacement keeps latest track state',async page=>{
 await page.route('**/*.mp3',async route=>{await new Promise(r=>setTimeout(r,450));await route.continue().catch(()=>{});});
 await page.goto(`${base}/music.html`);await ready(page);await page.locator('.music-track-listen').first().click();await page.locator('.music-track-listen').nth(1).click();
 await page.waitForFunction(()=>!remixPreviewAudio.paused&&remixPreviewAudio.currentTime>0,{},{timeout:10000});
 const state=await page.evaluate(()=>({id:activeRemixPreviewId,expected:document.querySelectorAll('[data-remix-id]')[1].dataset.remixId,src:remixPreviewAudio.src}));
 assert.equal(state.id,state.expected);return state;
});
await check('Seek before playback loads audio and starts preview',async page=>{
 await page.goto(`${base}/music.html`);await ready(page);await page.locator('.music-waveform[role=slider]').click({position:{x:100,y:20}});
 await page.waitForFunction(()=>!featuredPreviewAudio.paused&&featuredPreviewAudio.currentTime>1,{},{timeout:8000});return await page.evaluate(()=>({time:featuredPreviewAudio.currentTime,duration:featuredPreviewAudio.duration}));
});
await check('Pending seek cannot change a replacement track',async page=>{
 await page.route('**/*.mp3',async route=>{await new Promise(r=>setTimeout(r,450));await route.continue().catch(()=>{});});
 await page.goto(`${base}/music.html`);await ready(page);await page.locator('.music-track-listen').first().scrollIntoViewIfNeeded();
 await page.evaluate(()=>{const releases=musicReleases.filter(r=>r.category==='remix'&&r.previewUrl);seekRemixPreview(releases[0],0.8,true);playRemixPreview(releases[1]);window.expectedRemix=releases[1].id;});
 await page.waitForFunction(()=>!remixPreviewAudio.paused&&remixPreviewAudio.currentTime>0,{},{timeout:10000});
 const state=await page.evaluate(()=>({id:activeRemixPreviewId,expected:window.expectedRemix,time:remixPreviewAudio.currentTime}));assert.equal(state.id,state.expected);assert.ok(state.time<5);return state;
});
await check('Failed hero image releases loader',async page=>{await page.route('**/stage-main.webp',r=>r.abort('failed'));await page.goto(`${base}/index.html`);await ready(page);assert.equal(await page.locator('header').isVisible(),true);return await page.evaluate(()=>window.DOMIX_HEADER_PRELOAD_STATUS);});
await check('Cold slow load and warm reload',async(page,context)=>{
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:80000});
 await page.goto(`${base}/index.html`);await ready(page);const cold=await page.evaluate(()=>({time:performance.now(),status:window.DOMIX_HEADER_PRELOAD_STATUS}));
 await page.reload();await ready(page);const warm=await page.evaluate(()=>({time:performance.now(),status:window.DOMIX_HEADER_PRELOAD_STATUS}));return{cold,warm};
});
await check('200 percent zoom and touch gallery swipe',async(page,context)=>{
 await page.setViewportSize({width:390,height:844});await page.goto(`${base}/shows.html`);await ready(page);await page.locator('[data-gallery]').first().click();
 const old=await page.locator('.show-lightbox-image').getAttribute('src');
 await page.locator('.show-lightbox-stage').evaluate(el=>{
   const start=new Touch({identifier:1,target:el,clientX:250,clientY:300});
   const end=new Touch({identifier:1,target:el,clientX:100,clientY:300});
   el.dispatchEvent(new TouchEvent('touchstart',{touches:[start],bubbles:true}));
   el.dispatchEvent(new TouchEvent('touchend',{changedTouches:[end],bubbles:true}));
 });assert.notEqual(await page.locator('.show-lightbox-image').getAttribute('src'),old);
 await page.keyboard.press('Escape');const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});assert.equal(await page.evaluate(()=>visualViewport.scale),2);return{scale:await page.evaluate(()=>visualViewport.scale),syntheticTouch:true};
});
await check('SoundCloud consent creates one player, no early third party request',async page=>{
 const external=[];page.on('request',r=>{if(!r.url().startsWith(base))external.push(r.url());});await page.goto(`${base}/index.html`);await ready(page);assert.deepEqual(external,[]);
 await page.locator('.soundcloud-consent-button').click();await page.waitForTimeout(3500);assert.equal(await page.locator('iframe').count(),1);return{external};
});
await check('Repeated search/toggle does not accumulate DOM or event listeners',async(page,context)=>{
 await page.goto(`${base}/music.html`);await ready(page);const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
 async function metrics(){await page.waitForTimeout(300);await cdp.send('HeapProfiler.collectGarbage');const {metrics}=await cdp.send('Performance.getMetrics');return Object.fromEntries(metrics.filter(x=>['Nodes','JSEventListeners','JSHeapUsedSize'].includes(x.name)).map(x=>[x.name,x.value]));}
 const before=await metrics();await page.evaluate(()=>{for(let i=0;i<40;i++){musicSearch.value='tech';renderMusicPage();musicSearch.value='';renderMusicPage();}});const after=await metrics();assert.ok(after.JSEventListeners<=before.JSEventListeners+5);return{before,after};
});
await browser.close();fs.writeFileSync(`output/playwright/${phase}/regressions.json`,JSON.stringify(checks,null,2));
