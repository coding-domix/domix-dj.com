import fs from 'node:fs';
const urls=new Set();
for(const file of ['index.html','shows.html','music.html','about.html','contact.html','legal-privacy.html']){
 const text=fs.readFileSync(file,'utf8');
 for(const m of text.matchAll(/['"](https:\/\/[^'"<>\s]+)['"]/g))urls.add(m[1].replaceAll('&amp;','&'));
}
const previous=process.argv.includes('--retry')?JSON.parse(fs.readFileSync('output/playwright/external-links.json')):[];
const rows=previous.filter(row=>!row.error);
for(const url of (previous.length?previous.filter(row=>row.error).map(row=>row.url):urls)){
 try{
   const response=await fetch(url,{method:'HEAD',redirect:'follow',signal:AbortSignal.timeout(12000)});
   rows.push({url,status:response.status,finalUrl:response.url,headers:Object.fromEntries(response.headers)});
 }catch(error){rows.push({url,error:error.message,cause:error.cause?.message});}
 console.log(JSON.stringify({url,status:rows.at(-1).status,error:rows.at(-1).error}));
}
fs.writeFileSync('output/playwright/external-links.json',JSON.stringify(rows,null,2));
