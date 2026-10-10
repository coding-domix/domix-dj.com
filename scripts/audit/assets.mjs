// Lossless candidates only; never resize or quantize the supplied artwork.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('output/playwright/tools/package.json'));
const sharp = require('sharp');
const apply = process.argv.includes('--apply');
const files = ['images/domix/partners/marchfelder-bank-logo.png','images/social/instagram-icon.png','images/social/soundcloud-icon.png','images/domix/sets/cafe-opera-tomorrowland-academy.png','releases/remixes/where-have-you-been/cover.png'];
const results=[];
for(const file of files){
 const source=fs.readFileSync(`output/playwright/baseline-site/${file}`);
 const isPartner=file.includes('/partners/');
 const candidate=isPartner
   ? await sharp(source).keepIccProfile().png({compressionLevel:9,adaptiveFiltering:true,palette:false}).toBuffer()
   : await sharp(source).keepIccProfile().webp({lossless:true,effort:6}).toBuffer();
 const before=await sharp(source).ensureAlpha().raw().toBuffer();
 const after=await sharp(candidate).ensureAlpha().raw().toBuffer();
 const identical=before.equals(after);
 let visiblePixelsIdentical=before.length===after.length;
 for(let i=0;visiblePixelsIdentical&&i<before.length;i+=4){
   if(before[i+3]!==after[i+3]||(before[i+3]&&(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2])))visiblePixelsIdentical=false;
 }
 const target=isPartner?file:file.replace(/\.png$/,'.webp');
 const row={file,target,before:source.length,after:candidate.length,identical,visiblePixelsIdentical,rgbaSha256:createHash('sha256').update(before).digest('hex'),applied:apply&&visiblePixelsIdentical&&candidate.length<source.length};
 if(row.applied){
   fs.writeFileSync(target,candidate);
   if(target!==file)for(const textFile of ['index.html','shows.html','music.html','about.html','contact.html','legal-privacy.html','css/styles.css']){
     const sourceText=fs.readFileSync(textFile,'utf8');
     if(sourceText.includes(file))fs.writeFileSync(textFile,sourceText.replaceAll(file,target));
   }
 }
 results.push(row);console.log(JSON.stringify(row));
}
fs.writeFileSync('output/playwright/lossless-assets.json',JSON.stringify(results,null,2));
