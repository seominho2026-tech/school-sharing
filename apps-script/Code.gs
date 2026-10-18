/* 학교 계정으로 배포: 실행 사용자=배포자, 접근=학교 도메인. */
const TABLES_ = ['duties', 'tasks', 'teachers', 'depts', 'posts', 'forms', 'admins', 'events'];
const MAX_RECORDS_ = 5000;

function actor_() {
  const email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!schoolEmail_(email)) throw new Error('학교 계정으로 로그인해 주세요. 계정을 확인할 수 없으면 접근할 수 없습니다.');
  if (String(Session.getEffectiveUser().getEmail()).toLowerCase() !== CONFIG_.ownerEmail)
    throw new Error('관리자 학교 계정으로 배포해야 합니다.');
  return {email: email, name: email.split('@')[0]};
}
function schoolEmail_(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+$/.test(email) && email.split('@')[1] === CONFIG_.domain;
}
function doGet(e) {
  actor_();
  const page = e && e.parameter && e.parameter.page === 'privacy' ? 'Privacy' : 'Index';
  const template = HtmlService.createTemplateFromFile(page);
  template.appUrlJson = JSON.stringify(ScriptApp.getService().getUrl()).replace(/</g, '\\u003c');
  return template.evaluate().setTitle(CONFIG_.name + ' 부별공유').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function database_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('관리자가 데이터 저장용 시트를 연결해야 합니다.');
  return SpreadsheetApp.openById(id);
}
/* 편집기에서 관리자만 실행합니다. 기존 데이터는 지우지 않습니다. */
function setupDatabase() {
  const actor = actor_();
  if (actor.email !== CONFIG_.ownerEmail) throw new Error('관리자만 초기화할 수 있습니다.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const book = database_();
    assertDatabaseAccess_(book.getId());
    let sheet = book.getSheetByName('records');
    if (!sheet) sheet = book.insertSheet('records');
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, 3).setValues([['collection', 'id', 'json']]);
    const header = sheet.getRange(1, 1, 1, 3).getValues()[0];
    if (header.join('|') !== 'collection|id|json') throw new Error('기존 시트의 열 구성이 다릅니다. 변경하지 않았습니다.');
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#1F3B63').setFontColor('#ffffff');
    sheet.setColumnWidth(1, 130); sheet.setColumnWidth(2, 240); sheet.setColumnWidth(3, 600);
    book.setSpreadsheetTimeZone('Asia/Seoul');
    PropertiesService.getScriptProperties().setProperty('DATABASE_VERIFIED_ID', book.getId());
    SpreadsheetApp.flush();
    return {ready:true, spreadsheetId:book.getId()};
  } finally { lock.releaseLock(); }
}
function assertDatabaseAccess_(id) {
  const file = Drive.Files.get(id, {supportsAllDrives:true, fields:'id,driveId,parents,mimeType'});
  if (file.mimeType !== 'application/vnd.google-apps.spreadsheet' || file.driveId !== PropertiesService.getScriptProperties().getProperty('SHARED_DRIVE_ID'))
    throw new Error('지정한 학교 공유드라이브의 구글 시트가 아닙니다.');
  let parents = file.parents || [], inside = parents.includes(PropertiesService.getScriptProperties().getProperty('SHARED_FOLDER_ID')), depth = 0;
  while (!inside && parents.length && depth++ < 10) {
    const parent = Drive.Files.get(parents[0], {supportsAllDrives:true, fields:'parents'});
    parents = parent.parents || []; inside = parents.includes(PropertiesService.getScriptProperties().getProperty('SHARED_FOLDER_ID'));
  }
  if (!inside) throw new Error('지정한 부서별공유폴더 안의 시트를 사용해 주세요.');
  let token;
  do {
    const response = Drive.Permissions.list(id, {supportsAllDrives:true, pageSize:100, pageToken:token,
      fields:'nextPageToken,permissions(type,role,emailAddress,domain)'});
    (response.permissions || []).forEach(p => {
      if (p.type === 'anyone' || (p.type === 'domain' && p.domain !== CONFIG_.domain))
        throw new Error('데이터 시트는 외부에 공개할 수 없습니다. 제한된 접근 폴더를 사용해 주세요.');
      if (['writer','owner','fileOrganizer'].includes(p.role) &&
          !(p.type === 'user' && String(p.emailAddress).toLowerCase() === CONFIG_.ownerEmail))
        throw new Error('일반 사용자가 데이터 시트를 직접 편집할 수 있습니다. 관리자 전용 제한된 접근 폴더가 필요합니다.');
    });
    token = response.nextPageToken;
  } while (token);
}
function load_() {
  const book = database_();
  if (PropertiesService.getScriptProperties().getProperty('DATABASE_VERIFIED_ID') !== book.getId())
    throw new Error('관리자가 setupDatabase를 먼저 실행해야 합니다.');
  const sheet = book.getSheetByName('records');
  if (!sheet) throw new Error('데이터 시트가 없습니다.');
  if (sheet.getLastRow() > MAX_RECORDS_ + 601) throw new Error('데이터가 많습니다. 관리자에게 정리를 요청해 주세요.');
  const rows = sheet.getDataRange().getValues();
  if (rows[0].join('|') !== 'collection|id|json') throw new Error('데이터 시트 형식이 올바르지 않습니다.');
  const state = {};
  TABLES_.concat(['_receipts']).forEach(k => state[k] = {});
  rows.slice(1).forEach(row => {
    if (!row[0] && !row[1] && !row[2]) return;
    const table = String(row[0]), id = String(row[1]);
    if (!Object.prototype.hasOwnProperty.call(state, table) || !id || ['__proto__','constructor','prototype'].includes(id))
      throw new Error('데이터 행이 올바르지 않습니다.');
    if (state[table][id]) throw new Error('중복된 데이터 ID가 있습니다.');
    state[table][id] = JSON.parse(String(row[2]));
  });
  return {sheet:sheet, state:state, count:rows.length};
}
function persist_(db) {
  const rows = [['collection','id','json']];
  TABLES_.forEach(k => Object.keys(db.state[k]).forEach(id => rows.push([k,id,JSON.stringify(db.state[k][id])])));
  if (rows.length > MAX_RECORDS_ + 1) throw new Error('저장 가능한 기록 수를 초과했습니다.');
  Object.entries(db.state._receipts).sort((a,b)=>b[1].time-a[1].time).slice(0,500)
    .forEach(([id,r]) => rows.push(['_receipts',id,JSON.stringify(r)]));
  if (rows.some(r => r[2].length > 45000)) throw new Error('한 기록의 내용이 너무 큽니다.');
  while (rows.length < db.count) rows.push(['','','']);
  if (db.sheet.getMaxRows() < rows.length) db.sheet.insertRowsAfter(db.sheet.getMaxRows(), rows.length-db.sheet.getMaxRows());
  db.sheet.getRange(1,1,rows.length,3).setNumberFormat('@').setValues(rows);
  SpreadsheetApp.flush();
}
function schoolApi(request) {
  const user = actor_();
  if (!request || typeof request.action !== 'string' || JSON.stringify(request).length > 200000)
    throw new Error('올바르지 않은 요청입니다.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('다른 저장을 처리 중입니다. 잠시 후 다시 시도해 주세요.');
  try {
    const db = load_(), action = request.action, payload = request.payload || {};
    user.name = db.state.teachers[user.email]?.name || user.name;
    if (action === 'snapshot') return snapshot_(db.state, user);
    const key = request.requestId;
    if (typeof key !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(key)) throw new Error('요청 번호가 필요합니다.');
    const receiptId = user.email + ':' + key;
    const receipt = db.state._receipts[receiptId];
    if (receipt) return receipt.result;
    const result = mutate_(db.state, user, action, payload, key);
    db.state._receipts[receiptId] = {time:Date.now(), result:result};
    persist_(db);
    return result;
  } finally { lock.releaseLock(); }
}
function snapshot_(state, user) {
  const result = {user:user, role:state.admins[user.email] || null, serverTime:Date.now()};
  TABLES_.forEach(k => result[k] = Object.values(state[k]));
  // 전체 편집 권한 명단은 관리자만 읽고, 본인 권한은 role로 제공합니다.
  if (user.email !== CONFIG_.ownerEmail) result.admins = [];
  return result;
}
function require_(condition, message) { if (!condition) throw new Error(message || '이 작업을 할 권한이 없습니다.'); }
function text_(value, max, required) {
  require_(typeof value === 'string', '문자열 값이 필요합니다.');
  const s = value.trim(); require_(s.length <= max && (!required || s.length > 0), '입력 길이를 확인해 주세요.'); return s;
}
function url_(value) { const s = text_(value || '', 500); require_(!s || /^https?:\/\/[^\s]+$/i.test(s),'http 또는 https 주소만 사용할 수 있습니다.'); return s; }
function list_(value, max) { require_(Array.isArray(value) && value.length <= max,'항목 수가 너무 많거나 형식이 잘못됐습니다.'); return value; }
function links_(value) { return list_(value || [],10).filter(l=>l.label || l.href).map(l=>({label:text_(l.label,40,true),href:url_(l.href)})); }
function dept_(id, optional) { require_((optional && id === '') || CONFIG_.departmentIds.includes(id),'등록된 부서를 골라 주세요.'); return id; }
function date_(value) {
  const s = text_(value,10,true); require_(/^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s,'날짜가 올바르지 않습니다.'); return s;
}
function canEdit_(state,user,dept) { const role=state.admins[user.email]; return user.email===CONFIG_.ownerEmail || !!role && (!role.dept || role.dept===dept); }
function editor_(state,user) { return user.email===CONFIG_.ownerEmail || !!state.admins[user.email]; }
function email_(value, optional) { const e=text_(value || '',120).toLowerCase();require_(optional && !e || schoolEmail_(e),'학교 이메일을 입력해 주세요.');return e; }
function record_(state,table,id) { require_(typeof id==='string' && Object.prototype.hasOwnProperty.call(state[table],id),'기록을 찾을 수 없습니다.');return state[table][id]; }
function checkVersion_(old,p) { require_(Number.isInteger(p.version) && old.version===p.version,'다른 사람이 먼저 수정했습니다. 새로고침 후 다시 수정해 주세요.'); }
function clean_(table,p) {
  if(table==='duties') return {deptId:dept_(p.deptId),title:text_(p.title,60,true),owner:text_(p.owner||'',20),summary:text_(p.summary||'',300),routines:list_(p.routines,10).filter(r=>r.cycle || r.what).map(r=>({cycle:text_(r.cycle,60,true),what:text_(r.what,160,true)})),links:links_(p.links)};
  if(table==='tasks') {
    const assignees=list_(p.assignees,200).map(a=>({name:text_(a.name,20,true),email:email_(a.email)}));
    const targets=[...new Set(list_(p.targets,60).map(t=>text_(t,30,true)))];
    require_(assignees.length+targets.length>0,'제출 대상이 필요합니다.');
    return {deptId:dept_(p.deptId,true),title:text_(p.title,60,true),due:date_(p.due),docUrl:url_(p.docUrl),guide:text_(p.guide||'',300),ownerName:text_(p.ownerName||'',20),ownerEmail:email_(p.ownerEmail,true),targets:targets,assignees:assignees};
  }
  if(table==='posts') return {deptId:dept_(p.deptId),title:text_(p.title,60,true),body:text_(p.body,4000),links:links_(p.links)};
  if(table==='forms') return {deptId:dept_(p.deptId),dutyId:text_(p.dutyId||'',120),label:text_(p.label,40,true),href:url_(p.href),kind:text_(p.kind||'',20)};
  if(table==='events') {
    require_(['schedule','deadline'].includes(p.kind),'일정 종류가 올바르지 않습니다.');
    require_(!p.status || ['published','pending'].includes(p.status),'일정 상태가 올바르지 않습니다.');
    return {date:date_(p.date),title:text_(p.title,60,true),kind:p.kind,dept:text_(p.dept||'',30),detail:text_(p.detail||'',300),status:p.status||'published',links:links_(p.links)};
  }
  throw new Error('지원하지 않는 기록입니다.');
}
function mutate_(state,user,action,p,key) {
  const owner=user.email===CONFIG_.ownerEmail, now=Date.now();
  if(action==='saveTeachers') {
    require_(canEdit_(state,user,''));
    const rows=list_(p.list,400).map(t=>({email:email_(t.email),name:text_(t.name,20,true),dept:text_(t.dept||'',30)}));
    rows.forEach(t=>state.teachers[t.email]={...t,id:t.email,updatedBy:user.email,version:(state.teachers[t.email]?.version||0)+1});return rows.length;
  }
  if(action==='removeTeacher' || action==='clearTeachers') {
    require_(canEdit_(state,user,''));
    if(action==='removeTeacher') {delete state.teachers[email_(p.email)];return true;}
    const count=Object.keys(state.teachers).length;state.teachers={};return count;
  }
  if(action==='addAdmin' || action==='removeAdmin') {
    require_(owner);const email=email_(p.email);
    if(action==='removeAdmin') delete state.admins[email];
    else state.admins[email]={id:email,email:email,name:text_(p.name,20,true),dept:dept_(p.dept,true),version:(state.admins[email]?.version||0)+1};
    return true;
  }
  if(action==='saveDriveUrl') {
    const id=dept_(p.deptId);require_(canEdit_(state,user,id));
    if(state.depts[id]) checkVersion_(state.depts[id],p);
    state.depts[id]={id:id,driveUrl:url_(p.url),updatedBy:user.email,version:(state.depts[id]?.version||0)+1};return true;
  }
  if(action==='toggleTaskDone') {
    const task=record_(state,'tasks',p.id);require_(typeof p.done==='boolean');
    const manager=task.authorEmail===user.email || task.ownerEmail===user.email;
    const target=text_(p.target,120,true);
    require_(task.targets.includes(target)||task.assignees.some(a=>a.email===target),'등록된 제출 대상이 아닙니다.');
    require_(manager || target===user.email);
    task.done=p.done?[...new Set([...task.done,target])]:task.done.filter(t=>t!==target);task.version++;return true;
  }
  if(action==='addEvents') {
    require_(editor_(state,user));const rows=list_(p.inputs,300).map(v=>clean_('events',v));require_(rows.length>0);
    rows.forEach((row,i)=>{const id=key+'-'+i;state.events[id]={...row,id:id,authorEmail:user.email,createdAt:now,version:1};});return rows.length;
  }
  if(['approveEvent','setEventLinks','editEvent'].includes(action)) {
    require_(editor_(state,user));const old=record_(state,'events',p.id);checkVersion_(old,p);
    if(action==='approveEvent') old.status='published';
    if(action==='setEventLinks') old.links=links_(p.links);
    if(action==='editEvent') {const patch=p.patch||{};require_(Object.keys(patch).every(k=>['date','title','dept','detail','kind'].includes(k)));Object.assign(old,clean_('events',{...old,...patch}));}
    old.version++;return true;
  }
  const match=/^(add|update|remove)(Duty|Task|Post|Form|Event)$/.exec(action);
  require_(match,'지원하지 않는 작업입니다.');
  const op=match[1], table={Duty:'duties',Task:'tasks',Post:'posts',Form:'forms',Event:'events'}[match[2]];
  if(op==='add') {
    const body=clean_(table,p.input);
    if(['duties','forms'].includes(table)) require_(canEdit_(state,user,body.deptId));
    if(table==='events') require_(editor_(state,user));
    state[table][key]={...body,id:key,authorEmail:user.email,authorName:user.name,createdAt:now,version:1,...(table==='tasks'?{done:[]}: {})};return key;
  }
  const old=record_(state,table,p.id);checkVersion_(old,p);
  if(table==='events') require_(editor_(state,user));
  else if(table==='tasks') require_(old.authorEmail===user.email||old.ownerEmail===user.email);
  else { require_(old.authorEmail===user.email);if(['duties','forms'].includes(table)) require_(canEdit_(state,user,old.deptId)); }
  if(op==='remove') {delete state[table][p.id];return true;}
  const body=clean_(table,p.input);
  require_(body.deptId===old.deptId,'수정 중 부서를 바꿀 수 없습니다.');
  state[table][p.id]={...old,...body,version:old.version+1};return true;
}
