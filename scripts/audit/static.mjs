import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=process.argv[2] || '.';
const files=['index.html','index_mobil.html','shows.html','music.html','about.html','contact.html','legal-privacy.html','css/styles.css','js/site.js'];
const issues=[],references=[],external=new Set();
const decode=s=>s.replaceAll('&amp;','&');
for(const file of files){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 for(const id of new Set(ids))if(ids.filter(x=>x===id).length>1)issues.push({file,type:'duplicate-id',id});
 for(const m of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))try{new vm.Script(m[1],{filename:file});}catch(e){issues.push({file,type:'syntax',message:e.message});}
 if(file.endsWith('.js'))new vm.Script(source,{filename:file});
 const paths=[...source.matchAll(/(?:href|src|data-src)="([^"]+)"/g)].map(m=>decode(m[1]));
 for(const m of source.matchAll(/url\(["']?([^\)"']+)["']?\)/g))paths.push(m[1]);
 for(const m of source.matchAll(/['"]((?:images|releases)\/[^'"`]+\.(?:webp|png|jpg|svg|mp3))['"]/g))paths.push(m[1]);
 for(const href of new Set(paths)){
   if(/^(https?:)?\/\//.test(href)){external.add(href);if(href.startsWith('http:'))issues.push({file,type:'insecure',href});continue;}
   if(/^(mailto:|data:|blob:)|\$\{/.test(href))continue;
   const [p,hash]=href.split('#');
   const target=p?path.resolve(root,path.dirname(file),decodeURIComponent(p.split('?')[0])):path.resolve(root,file);
   references.push({file,href});
   if(!fs.existsSync(target))issues.push({file,type:'missing',href});
   else if(hash&&target.endsWith('.html')&&!fs.readFileSync(target,'utf8').includes(`id="${decodeURIComponent(hash)}"`))issues.push({file,type:'missing-anchor',href});
 }
 for(const m of source.matchAll(/<a\b([^>]+)>/g))if(/target="_blank"/.test(m[1])&&!/rel="[^"]*noopener/.test(m[1]))issues.push({file,type:'opener',tag:m[0]});
}
const result={root,files:files.length,references:references.length,issues,external:[...external]};
fs.mkdirSync('output/playwright',{recursive:true});
fs.writeFileSync(`output/playwright/static-${root==='.'?'after':'before'}.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify({files:result.files,references:result.references,issues,externalCount:external.size},null,2));
