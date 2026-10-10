import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('output/playwright/tools/package.json'));
const { chromium } = require('playwright');
const { default: lighthouse } = await import(pathToFileURL(require.resolve('lighthouse')));
const { default: desktopConfig } = await import(pathToFileURL(path.resolve('output/playwright/tools/node_modules/lighthouse/core/config/desktop-config.js')));
const phase = process.argv[2] || 'before';
const port = phase === 'before' ? 4173 : 4174;
const out = `output/playwright/${phase}/lighthouse`;
fs.mkdirSync(out,{recursive:true});
const results=[];
for (const file of ['index.html','shows.html','music.html','about.html','contact.html','legal-privacy.html']) {
  for (const formFactor of ['mobile','desktop']) {
    for (let run=1;run<=3;run++) {
      const name=`${file}-${formFactor}-${run}`;
      if(!process.argv.includes('--fresh')&&fs.existsSync(`${out}/${name}.json`)){ const lhr=JSON.parse(fs.readFileSync(`${out}/${name}.json`)); if(lhr.configSettings.formFactor===formFactor) {results.push(summarize(lhr,file,formFactor,run)); continue;} }
      const browser=await chromium.launch({channel:'chrome',headless:true,args:['--remote-debugging-port=9223']});
      try {
        const result=await lighthouse(`http://127.0.0.1:${port}/${file}`, {port:9223,output:'json',logLevel:'error',onlyCategories:['performance','accessibility','best-practices','seo']}, formFactor==='desktop'?desktopConfig:undefined);
        fs.writeFileSync(`${out}/${name}.json`,JSON.stringify(result.lhr));
        const summary=summarize(result.lhr,file,formFactor,run); results.push(summary); console.log(JSON.stringify(summary));
      } finally { await browser.close(); }
    }
  }
}
fs.writeFileSync(`${out}/summary.json`,JSON.stringify(results,null,2));
function summarize(lhr,file,formFactor,run) {
 const value=id=>lhr.audits[id]?.numericValue;
 return {file,formFactor,run,score:lhr.categories.performance.score*100,LCP:value('largest-contentful-paint'),CLS:value('cumulative-layout-shift'),FCP:value('first-contentful-paint'),TBT:value('total-blocking-time'),SI:value('speed-index'),bytes:value('total-byte-weight'),requests:lhr.audits['network-requests'].details.items.length,error:lhr.runtimeError};
}
