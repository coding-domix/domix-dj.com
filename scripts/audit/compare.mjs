import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require=createRequire(path.resolve('output/playwright/tools/package.json'));
const {PNG}=require('pngjs');
const {default:pixelmatch}=await import(pathToFileURL(require.resolve('pixelmatch')));
const engine=process.argv[2]||'chromium';
const before=`output/playwright/before/${engine}`,after=`output/playwright/after/${engine}`,out=`output/playwright/diffs/${engine}`;
fs.mkdirSync(out,{recursive:true});
const results=[];
for(const file of fs.readdirSync(before).filter(f=>f.endsWith('.png'))){
 if(!fs.existsSync(`${after}/${file}`)){results.push({file,missingAfter:true});continue;}
 const a=PNG.sync.read(fs.readFileSync(`${before}/${file}`)),b=PNG.sync.read(fs.readFileSync(`${after}/${file}`));
 if(a.width!==b.width||a.height!==b.height){results.push({file,dimensionsBefore:[a.width,a.height],dimensionsAfter:[b.width,b.height]});continue;}
 const diff=new PNG({width:a.width,height:a.height});
 const pixels=pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:0,includeAA:true});
 const perceptualPixels=pixelmatch(a.data,b.data,null,a.width,a.height,{threshold:0.1,includeAA:false});
 results.push({file,pixels,perceptualPixels,total:a.width*a.height,percent:100*pixels/(a.width*a.height)});
 if(pixels)fs.writeFileSync(`${out}/${file}`,PNG.sync.write(diff));
}
fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify(results.filter(r=>r.pixels!==0),null,2));
console.log(`${engine}: ${results.filter(r=>r.pixels===0).length}/${results.length} pixel-identical screenshots`);
