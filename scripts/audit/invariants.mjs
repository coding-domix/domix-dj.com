import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(path.resolve('output/playwright/tools/package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
for(const file of ['index.html','shows.html','music.html','about.html','contact.html','legal-privacy.html']){
 const snapshots=[];
 for(const port of [4173,4174]){
  const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto(`http://127.0.0.1:${port}/${file}`);await page.waitForFunction(()=>!document.documentElement.matches('.page-loading,.page-loader-pending'));
  snapshots.push(await page.evaluate(()=>({
   text:[...document.querySelectorAll('body *')].filter(e=>!['SCRIPT','STYLE'].includes(e.tagName)).flatMap(e=>[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim())).filter(Boolean),
   images:[...document.images].map(i=>({alt:i.alt,width:i.width,height:i.height})),
   links:[...document.querySelectorAll('a')].map(a=>({text:a.textContent,href:a.getAttribute('href')?.replace('marchfelder-bank-show','lange-einkaufsnacht-show')})),
   styles:[...document.querySelectorAll('body *')].filter(e=>!['SCRIPT','STYLE'].includes(e.tagName)).map(e=>{const s=getComputedStyle(e);return{tag:e.tagName,cls:e.className,font:s.font,color:s.color,backgroundColor:s.backgroundColor,padding:s.padding,margin:s.margin,gap:s.gap};})
  })));await page.close();
 }
 try{assert.deepEqual(snapshots[0],snapshots[1]);results.push({file,equal:true});}catch(error){results.push({file,equal:false,message:error.message.slice(0,2000)});}
}
await browser.close();fs.writeFileSync('output/playwright/content-invariants.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
