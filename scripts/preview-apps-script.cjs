/* 로컬 테스트 전용: 실제 Google 계정이나 시트에 연결하지 않습니다. */
const http=require('node:http'),fs=require('node:fs'),vm=require('node:vm');
const port=Number(process.env.PORT||4319);
let rows=[['collection','id','json']];
const sheet={getLastRow:()=>rows.length,getMaxRows:()=>10000,getDataRange:()=>({getValues:()=>structuredClone(rows)}),getRange(r,c,h,w){return {setNumberFormat(){return this;},setValues(v){v.forEach((row,i)=>rows[r-1+i]=structuredClone(row));return this;}};}};
const config=fs.readFileSync('apps-script/Config.gs','utf8');
const ctx=vm.createContext({console,Date,JSON,Session:{getActiveUser:()=>({getEmail:()=> 'smt_kor03@seongmohs.djsch.kr'}),getEffectiveUser:()=>({getEmail:()=> 'smt_kor03@seongmohs.djsch.kr'})},PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'local-test-only'})},SpreadsheetApp:{openById:()=>({getId:()=> 'local-test-only',getSheetByName:()=>sheet}),flush(){}},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})}});
vm.runInContext(config+fs.readFileSync('apps-script/Code.gs','utf8'),ctx);
const bootstrap=`window.google={script:{run:{withSuccessHandler(fn){return {...this,success:fn}},withFailureHandler(fn){return {...this,failure:fn}},schoolApi(request){fetch('/_test/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)}).then(r=>r.json()).then(r=>{if(r.error)this.failure({message:r.error});else this.success(r.data)}).catch(e=>this.failure(e))}}}};`;
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(req.method==='POST'&&url.pathname==='/_test/api') {
   let body='';req.on('data',chunk=>{body+=chunk;if(body.length>300000)req.destroy();});req.on('end',()=>{res.setHeader('Content-Type','application/json');try{res.end(JSON.stringify({data:ctx.schoolApi(JSON.parse(body))}));}catch(e){res.end(JSON.stringify({error:e.message}));}});return;
 }
 if(req.method!=='GET'){res.writeHead(405).end();return;}
 let html=fs.readFileSync('apps-script/'+(url.searchParams.get('page')==='privacy'?'Privacy':'Index')+'.html','utf8');
 html=html.replace('<?!= appUrlJson ?>',JSON.stringify('http://127.0.0.1:'+port+'/')).replace('<body>','<body><aside style="padding:8px;background:#fff1cc;text-align:center">로컬 기능 검사 · 실제 학교 데이터가 아닙니다 · 서버를 끄면 초기화됩니다</aside><script>'+bootstrap+'</script>');
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
}).listen(port,'127.0.0.1',()=>console.log('Local simulation only: http://127.0.0.1:'+port));
