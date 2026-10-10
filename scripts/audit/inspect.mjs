import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(path.resolve('output/playwright/tools/package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
for(const port of [4173,4174]){
 const page=await browser.newPage();const cdp=await page.context().newCDPSession(page);const network=[],consoleMessages=[];
 await cdp.send('Network.enable');cdp.on('Network.responseReceived',({response})=>{if(response.status>=400)network.push({url:response.url,status:response.status});});
 page.on('console',m=>{if(m.type()==='error')consoleMessages.push({text:m.text(),location:m.location()});});
 await page.goto(`http://127.0.0.1:${port}/index.html`);await page.waitForTimeout(1000);
 await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root}=await cdp.send('DOM.getDocument');const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'.home-hero-subline'});const fonts=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
 results.push({port,consoleMessages,network,fonts});await page.close();
}
await browser.close();fs.writeFileSync('output/playwright/console-inspection.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
