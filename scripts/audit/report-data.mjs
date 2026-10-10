import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(`output/playwright/${p}`));
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const rows=[];
for(const phase of ['before','after']){
 const path=`output/playwright/${phase}/lighthouse/summary.json`;
 if(!fs.existsSync(path))continue;
 const runs=JSON.parse(fs.readFileSync(path));
 for(const file of [...new Set(runs.map(r=>r.file))])for(const formFactor of ['mobile','desktop']){
  const group=runs.filter(r=>r.file===file&&r.formFactor===formFactor);
  rows.push({phase,file,formFactor,runs:group.length,...Object.fromEntries(['score','LCP','CLS','FCP','TBT','SI','bytes','requests'].map(k=>[k,median(group.map(r=>r[k]))]))});
 }
}
const results={performance:rows,browsers:{},screenshots:{},regressions:{},content:read('content-invariants.json'),assets:read('lossless-assets.json'),links:read('external-links.json').map(({url,status,error})=>({url,status,error}))};
for(const engine of ['chromium','firefox','webkit']){
 const browser=read(`after/${engine}/results.json`);
 const p=`output/playwright/after/${engine}/interaction-results.json`;
 const interactions=fs.existsSync(p)?JSON.parse(fs.readFileSync(p)):browser;
 results.browsers[engine]={version:browser.version,pages:browser.pages.length,overflow:browser.pages.filter(p=>p.width<p.scrollWidth),checks:interactions.interactions,errors:interactions.errors};
 const compare=read(`diffs/${engine}/results.json`);
 results.screenshots[engine]={total:compare.length,exact:compare.filter(r=>r.pixels===0).length,perceptualZero:compare.filter(r=>r.perceptualPixels===0).length,nonzero:compare.filter(r=>r.perceptualPixels!==0)};
}
for(const phase of ['before','after'])results.regressions[phase]=read(`${phase}/regressions.json`);
fs.mkdirSync('docs/audit-data',{recursive:true});fs.writeFileSync('docs/audit-data/2026-10-08.json',JSON.stringify(results,null,2));
console.log(JSON.stringify({performance:rows,screenshots:results.screenshots,browsers:Object.fromEntries(Object.entries(results.browsers).map(([k,v])=>[k,{version:v.version,pages:v.pages,passed:v.checks.filter(c=>c.passed).length,checks:v.checks.length,overflow:v.overflow.length}])),external:results.links.length},null,2));
