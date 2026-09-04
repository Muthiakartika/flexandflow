/* Isolated integration tests: actual route/actions, mocked external boundaries.
 * Never writes to Neon, storage, Google Sheets or WhatsApp. */
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS loader interception isolates server dependencies in this test process. */
require('tsx/cjs');
const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');
const Module = require('node:module');
const sharp = require('sharp');
let fields, saved, stored, admin, jobs, deferred, failure;
const makeField = (kind, fieldKey = kind.toLowerCase()) => ({ id: fieldKey, fieldKey, kind, sectionKey: 'CLIENT_DETAILS', label: fieldKey, helpText: null, required: true, options: ['One', 'Two'], sortOrder: 0, isCustom: false, archived: false });
const prisma = {
  intakeFormField: {
    findUnique: async ({where}) => fields.find(f => where.id ? f.id === where.id : f.fieldKey === where.fieldKey) ?? null,
    findFirst: async ({where}) => fields.find(f => f.kind === where.kind && !f.archived && f.id !== where.id?.not) ?? null,
    aggregate: async () => ({_max: {sortOrder: Math.max(0,...fields.map(f=>f.sortOrder))}}),
    create: async ({data}) => { const row = {id: data.fieldKey, archived:false,...data}; fields.push(row); return row; },
    update: async ({where,data}) => { const row=fields.find(f=>f.id===where.id); Object.assign(row,data); return row; },
  },
  auditLog: { create: async () => ({}) },
};
const mocks = {
  'server-only': {},
  'next/cache': { updateTag:()=>{}, revalidatePath:()=>{} },
  'next/server': { after: fn => deferred.push(fn) },
  '@/lib/db': { prisma },
  '@/lib/admin/auth': { actingAdmin:async()=>admin, currentAdmin:async()=>admin },
  '@/lib/intake/settings': { loadIntakeSettings:async()=>({}), upsertIntakeSettings:async()=>{} },
  '@/lib/intake/sheets': { shareSheetWith:async()=>({ok:true}) },
  '@/lib/intake/read': { INTAKE_TAG:{fields:'intake'}, listPublicIntakeFields:async()=> {if(failure==='read')throw Error('test read failure'); return fields.filter(f=>!f.archived);} },
  '@/lib/intake/create': { createIntakeSubmission:async value=>{if(failure==='save')throw Error('test save failure');saved.push(value);return {id:'test',reference:'IN-TEST'};} },
  '@/lib/intake/guard': { guardIntakeRequest:async({website})=>website ? {ok:false,code:'SPAM_REJECTED',message:'Rejected'} : failure==='rate' ? {ok:false,code:'RATE_LIMITED',message:'Wait'} : {ok:true,ip:null} },
  '@/lib/intake/signature': { MAX_SIGNATURE_BYTES:512*1024,SIGNATURE_MIME_TYPE:'image/png',storeSignature:async()=>{if(failure==='storage')throw Error('test storage failure');stored++;return {url:'/test/signature.png'};} },
  '@/lib/intake/uploads': { storeIntakeImage:async()=>{stored++;return {url:'/test/image.png'};} },
  '@/lib/intake/notifications': {queueIntakeSubmissionCreated:async()=>{jobs++;},dispatchPendingIntake:async()=>{}},
  '@/lib/intake/sync': {syncSubmissionToSheet:async()=>{}},
};
const originalLoad=Module._load;
Module._load=function(id,...args){return Object.hasOwn(mocks,id)?mocks[id]:originalLoad.call(this,id,...args);};
const {POST}=require('../app/api/intake/route.ts');
const actions=require('../lib/intake/actions.ts');
const idle={ok:false,message:null};
beforeEach(()=>{fields=[makeField('TEXT','question'),makeField('SIGNATURE')];saved=[];stored=0;jobs=0;deferred=[];failure=null;admin={id:'test-admin',email:'admin@example.com'};});
async function png(){return new Uint8Array(await sharp({create:{width:8,height:8,channels:3,background:'white'}}).png().toBuffer());}
async function request(answers={question:'Answer'}, extras={}){
  const form=new FormData(); form.set('answers',typeof answers==='string'?answers:JSON.stringify(answers));
  form.set('signature',new File([await png()],'signature.png',{type:'image/png'}));
  for(const [key,value] of Object.entries(extras)){if(value===null)form.delete(key);else form.set(key,value);}
  return POST(new Request('http://localhost/api/intake/',{method:'POST',body:form}));
}
const formData = value => {const f=new FormData();for(const [k,v]of Object.entries(value))f.set(k,String(v));return f;};
test('valid multipart saves once, queues once and schedules integrations',async()=>{assert.equal((await request()).status,201);assert.equal(saved.length,1);assert.equal(stored,1);assert.equal(jobs,1);assert.equal(deferred.length,1);});
test('malformed multipart, JSON and missing answers return JSON 400',async()=>{assert.equal((await POST(new Request('http://localhost/api/intake/',{method:'POST',body:'bad'}))).status,400);for(const v of ['{bad','null','[]'])assert.equal((await request(v)).status,400);assert.equal((await request({}, {answers:null})).status,400);assert.equal(saved.length,0);});
test('missing required answers and signature never write storage',async()=>{assert.equal((await request({})).status,400);assert.equal((await request(undefined,{signature:null})).status,400);assert.equal(stored,0);});
test('forged signature and image rejected before storage',async()=>{fields.push(makeField('IMAGE','photo'));assert.equal((await request({question:'ok',photo:'fake-url'},{photo:new File(['bad'],'photo.png',{type:'image/png'})})).status,400);assert.equal(stored,0);});
test('real image succeeds without trusting filename answer',async()=>{fields.push(makeField('IMAGE','photo'));assert.equal((await request(undefined,{photo:new File([await png()],'photo.png',{type:'image/png'})})).status,201);assert.equal(saved[0].answers.photo,'/test/image.png');});
test('image URL cannot bypass required upload',async()=>{fields.push(makeField('IMAGE','photo'));assert.equal((await request({question:'ok',photo:'https://fake.test/x.png'})).status,400);assert.equal(stored,0);});
test('oversized signature rejected',async()=>{assert.equal((await request(undefined,{signature:new File([new Uint8Array(513*1024)],'signature.png',{type:'image/png'})})).status,400);assert.equal(stored,0);});
test('spam and rate limits do not write',async()=>{assert.equal((await request(undefined,{website:'bot'})).status,400);failure='rate';assert.equal((await request()).status,429);assert.equal(stored,0);});
test('database and storage failures return recoverable JSON errors',async()=>{const old=console.error;console.error=()=>{};try{for(const mode of ['read','save','storage']){failure=mode;const res=await request();assert.equal(res.status,500);assert.equal((await res.json()).code,'SERVER');}}finally{console.error=old;}});
test('public form still submits after admin removes signature',async()=>{fields[1].archived=true;assert.equal((await request(undefined,{signature:null})).status,201);});
test('admin permission checked for all field mutations',async()=>{admin=null;for(const fn of [actions.addIntakeFieldAction,actions.updateIntakeFieldAction,actions.deleteIntakeFieldAction,actions.restoreIntakeFieldAction])assert.equal((await fn(idle,formData({id:'question'}))).ok,false);assert.equal(fields.length,2);});
test('add radio, edit, remove, restore retains settings and field key',async()=>{const result=await actions.addIntakeFieldAction(idle,formData({label:'Test radio',kind:'RADIO',sectionKey:'CONSENT',options:'First\nSecond'}));assert.equal(result.ok,true);const f=fields.at(-1);assert.equal(f.isCustom,true);assert.deepEqual(f.options,['First','Second']);assert.equal((await actions.updateIntakeFieldAction(idle,formData({id:f.id,label:'Renamed',options:'Second\nThird'}))).ok,true);assert.equal((await actions.deleteIntakeFieldAction(idle,formData({id:f.id}))).ok,true);assert.equal(f.archived,true);assert.equal((await actions.restoreIntakeFieldAction(idle,formData({id:f.id}))).ok,true);assert.deepEqual(f.options,['Second','Third']);assert.equal(f.archived,false);});
test('original field can be removed and restored',async()=>{assert.equal((await actions.deleteIntakeFieldAction(idle,formData({id:'question'}))).ok,true);assert.equal(fields[0].archived,true);assert.equal((await actions.restoreIntakeFieldAction(idle,formData({id:'question'}))).ok,true);});
test('empty and duplicate options refused on create and update',async()=>{fields.push(makeField('RADIO'));for(const options of ['', 'One\nOne']){assert.equal((await actions.addIntakeFieldAction(idle,formData({kind:'RADIO',label:'Test',sectionKey:'CONSENT',options}))).ok,false);assert.equal((await actions.updateIntakeFieldAction(idle,formData({id:'radio',label:'Test',options}))).ok,false);}});
test('duplicate signature refused on create and restore',async()=>{assert.equal((await actions.addIntakeFieldAction(idle,formData({kind:'SIGNATURE',label:'Another',sectionKey:'CONSENT'}))).ok,false);fields.push({...makeField('SIGNATURE','old-signature'),archived:true});assert.equal((await actions.restoreIntakeFieldAction(idle,formData({id:'old-signature'}))).ok,false);});
test('custom labels cannot collide with multipart control names',async()=>{for(const label of ['Answers','Website','Signature','Turnstile token','Constructor']){assert.equal((await actions.addIntakeFieldAction(idle,formData({label,kind:'IMAGE',sectionKey:'CONSENT'}))).ok,true);assert.ok(fields.at(-1).fieldKey.startsWith('custom_'));}});
