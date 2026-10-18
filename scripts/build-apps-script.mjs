import fs from 'node:fs/promises';
import { build } from 'esbuild';
import vm from 'node:vm';
import ts from 'typescript';
const root = new URL('../', import.meta.url);
process.chdir(root.pathname.replace(/^\/([A-Za-z]:)/, '$1').split('/').map(decodeURIComponent).join('/'));
function configModule(source) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,process:{env:{}}});
  return exports;
}
const school = configModule(await fs.readFile('src/config/school.ts','utf8')).SCHOOL;
const departments = configModule(await fs.readFile('src/config/departments.ts','utf8')).departments;
const result = await build({entryPoints:['src/apps-script-entry.tsx'],bundle:true,write:false,minify:true,format:'iife',target:'es2022',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_BASE_PATH':'""','process.env.NEXT_PUBLIC_SCHOOL_DOMAIN':JSON.stringify(school.domain)}});
const js = result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const css = (await fs.readFile('src/app/globals.css','utf8')).replace(/<\/style/gi,'');
const assets = {};
for (const name of ['school-logo.png','icon-192.png','icon-512.png']) assets['/assets/'+name]='data:image/png;base64,'+(await fs.readFile('public/assets/'+name)).toString('base64');
const worker = await fs.readFile('public/pdf.worker.min.mjs','utf8');
const init = `window.__SCHOOL_APP_URL__=<?!= appUrlJson ?>;window.__SCHOOL_ASSETS__=${JSON.stringify(assets)};window.__PDF_WORKER__=URL.createObjectURL(new Blob([${JSON.stringify(worker).replace(/</g,'\\u003c')}],{type:'text/javascript'}));`;
for(const page of ['Index','Privacy']) {
  const html=`<!doctype html><html lang="ko"><head><base target="_blank"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${school.name} 부별공유</title><style>${css}</style></head><body><div id="root" data-page="${page==='Privacy'?'privacy':'home'}"></div><script>${init}</script><script>${js}</script></body></html>`;
  await fs.writeFile('apps-script/'+page+'.html',html);
}
await fs.writeFile('apps-script/Config.gs','const CONFIG_ = '+JSON.stringify({name:school.name,domain:school.domain,ownerEmail:school.ownerEmail,departmentIds:departments.map(d=>d.id)},null,2)+';\n');
console.log('Apps Script: Index.html, Privacy.html, Config.gs generated. No Firebase, external runtime CDN or secrets.');
