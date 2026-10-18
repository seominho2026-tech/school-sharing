import { SCHOOL, SCHOOL_DOMAIN_LIST } from '@/config/school';
import { gasCall, isAppsScript } from './apps-script';
import type { SavedDuty, SavedTask, Teacher, SchoolUser, DutyInput, TaskInput, DeptMeta, SavedPost, PostInput, SavedForm, FormInput, Admin, SchoolEvent, EventInput, SavedLink } from './school-types';
export * from './school-types';
export { LIMITS } from './school-limits';
export { parseTeacherText } from './teacher-parser';
export const OWNER_EMAIL: string = SCHOOL.ownerEmail;
export const SCHOOL_DOMAINS = SCHOOL_DOMAIN_LIST;
export const isSchoolLoginEnabled = true;
type Row = { id: string; version: number };
type Snapshot = { user: SchoolUser; role: Admin | null; duties: SavedDuty[]; tasks: SavedTask[]; teachers: Teacher[]; depts: (DeptMeta & Row)[]; posts: SavedPost[]; forms: SavedForm[]; admins: Admin[]; events: SchoolEvent[] };
let state: Snapshot | null = null;
let paused = false;
let pending: Promise<void> | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();
const errors = new Set<(message: string) => void>();
const emit = () => listeners.forEach(fn => fn());
export function isSchoolEmail(email: string | null | undefined) { return !!email && /^[^\s@]+@[^\s@]+$/.test(email) && SCHOOL_DOMAINS.includes(email.split('@')[1].toLowerCase()); }
export async function refreshSchool() {
  if (!isAppsScript() || paused) return;
  if (pending) return pending;
  pending = gasCall<Snapshot>('snapshot').then(data => { state = data; emit(); })
    .catch(error => { state = null; emit(); errors.forEach(fn=>fn(error.message)); throw error; })
    .finally(()=> { pending = null; });
  return pending;
}
function subscribe(fn: () => void) {
  listeners.add(fn); fn();
  if (!timer && isAppsScript()) {
    void refreshSchool().catch(()=>{});
    timer = setInterval(()=>{ if (!document.hidden && !paused) void refreshSchool().catch(()=>{}); }, 60000);
  }
  return () => { listeners.delete(fn); if (!listeners.size && timer) { clearInterval(timer); timer=null; } };
}
export function watchUser(callback: (user: SchoolUser | null) => void) { return subscribe(()=>callback(state?.user || null)); }
export function watchConnectionError(callback: (message: string) => void) { errors.add(callback); return ()=>{errors.delete(callback);}; }
export async function signInWithSchool(): Promise<SchoolUser> { paused=false; await refreshSchool(); if(!state?.user) throw new Error('학교 Apps Script 주소에서 학교 계정으로 열어 주세요.'); return state.user; }
export async function signOutSchool() { paused=true; state=null; emit(); }
export function watchMyRole(_email: string,onData: (role: Admin|null)=>void) { return subscribe(()=>onData(state?.role||null)); }
export function watchAdmins(onData: (rows: Admin[])=>void) { return subscribe(()=>onData(state?.admins||[])); }
export function watchDuties(dept: string,onData: (rows: SavedDuty[])=>void,onError?: ()=>void) { const remove=subscribe(()=>onData((state?.duties||[]).filter(r=>r.deptId===dept))); const error=onError?watchConnectionError(onError):()=>{};return ()=>{remove();error();}; }
export function watchTasks(onData: (rows: SavedTask[])=>void,onError?: ()=>void) { const remove=subscribe(()=>onData([...(state?.tasks||[])].sort((a,b)=>a.due.localeCompare(b.due))));const error=onError?watchConnectionError(onError):()=>{};return ()=>{remove();error();}; }
export function watchTeachers(onData: (rows: Teacher[])=>void) { return subscribe(()=>onData([...(state?.teachers||[])].sort((a,b)=>a.name.localeCompare(b.name,'ko')))); }
export function watchDeptMeta(dept: string,onData: (row: DeptMeta|null)=>void) { return subscribe(()=>onData(state?.depts.find(r=>r.id===dept)||null)); }
export function watchPosts(dept: string|null,onData: (rows: SavedPost[])=>void) { return subscribe(()=>onData((state?.posts||[]).filter(r=>!dept||r.deptId===dept).sort((a,b)=>b.createdAt-a.createdAt))); }
export function watchForms(dept: string,onData: (rows: SavedForm[])=>void) { return subscribe(()=>onData((state?.forms||[]).filter(r=>r.deptId===dept))); }
export function watchEvents(onData: (rows: SchoolEvent[])=>void) { return subscribe(()=>onData([...(state?.events||[])].sort((a,b)=>a.date.localeCompare(b.date)))); }
function version(table: keyof Snapshot,id: string) { const rows=state?.[table]; return Array.isArray(rows)?(rows as unknown as Row[]).find(r=>r.id===id)?.version:undefined; }
async function write<T=void>(action: string,payload: object): Promise<T> {
  if(!state?.user || paused) throw new Error('학교 계정으로 다시 연결해 주세요.');
  const result=await gasCall<T>(action,payload,crypto.randomUUID());
  // 저장은 성공했으므로 이후 조회 오류를 저장 실패로 표시하지 않습니다.
  await refreshSchool().catch(()=>{}); return result;
}
export const addDuty=(input:DutyInput,_user:SchoolUser)=>write('addDuty',{input});
export const updateDuty=(id:string,input:DutyInput,_user:SchoolUser,editVersion?:number)=>write('updateDuty',{id,input,version:editVersion});
export const removeDuty=(id:string)=>write('removeDuty',{id,version:version('duties',id)});
export const addTask=(input:TaskInput,_user:SchoolUser)=>write('addTask',{input});
export const updateTask=(id:string,input:TaskInput,_user:SchoolUser,editVersion?:number)=>write('updateTask',{id,input,version:editVersion});
export const removeTask=(id:string)=>write('removeTask',{id,version:version('tasks',id)});
export const toggleTaskDone=(id:string,target:string,done:boolean)=>write('toggleTaskDone',{id,target,done});
export const saveTeachers=(list:Teacher[],_user:SchoolUser)=>write<number>('saveTeachers',{list});
export const removeTeacher=(email:string)=>write('removeTeacher',{email});
export const clearTeachers=()=>write<number>('clearTeachers',{});
export const saveDriveUrl=(deptId:string,url:string,_user:SchoolUser)=>write('saveDriveUrl',{deptId,url,version:version('depts',deptId)});
export const addPost=(input:PostInput,_user:SchoolUser)=>write('addPost',{input});
export const removePost=(id:string)=>write('removePost',{id,version:version('posts',id)});
export const addForm=(input:FormInput,_user:SchoolUser)=>write('addForm',{input});
export const removeForm=(id:string)=>write('removeForm',{id,version:version('forms',id)});
export const addAdmin=(email:string,name:string,dept:string)=>write('addAdmin',{email,name,dept});
export const removeAdmin=(email:string)=>write('removeAdmin',{email});
export const addEvents=(inputs:EventInput[],_user:SchoolUser)=>write<number>('addEvents',{inputs});
export const removeEvent=(id:string)=>write('removeEvent',{id,version:version('events',id)});
export const approveEvent=(id:string)=>write('approveEvent',{id,version:version('events',id)});
export const setEventLinks=(id:string,links:SavedLink[])=>write('setEventLinks',{id,links,version:version('events',id)});
export const editEvent=(id:string,patch:{date?:string;title?:string;dept?:string;detail?:string;kind?:'schedule'|'deadline'})=>write('editEvent',{id,patch,version:version('events',id)});
