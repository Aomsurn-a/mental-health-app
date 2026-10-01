/* Run from backend: node tests/chat.integration.cjs [--browser] [--live]
 * Creates an isolated temporary MySQL schema using the local table definitions.
 * Only synthetic accounts/messages are inserted, then the test schema is removed.
 * --browser needs PLAYWRIGHT_PATH and a Vite server on TEST_UI_URL.
 * --live calls the configured MaxPlus provider with synthetic text only.
 */
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname,'../.env'), quiet:true });
const original = { base:process.env.MAXPLUS_BASE_URL, path:process.env.MAXPLUS_API_PATH, key:process.env.MAXPLUS_API_KEY };
const sourceDatabase = process.env.DB_NAME;
const configuredModel = process.env.MAXPLUS_MODEL?.trim() || 'claude-sonnet-5';
const testDatabase = 'mental_chat_test_' + Date.now();
const results = [];
let providerMode='success', received, browser, appServer, providerServer, pool, admin;
const record = name => { results.push({name,pass:true}); console.log('PASS '+name); };
const listen = server => new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve('http://127.0.0.1:'+server.address().port)));
(async()=>{
 try {
  assert.match(sourceDatabase,/^[a-zA-Z0-9_]+$/);
  assert.match(testDatabase,/^mental_chat_test_[0-9]+$/);
  admin=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD});
  await admin.query('CREATE DATABASE '+testDatabase+' CHARACTER SET utf8mb4');
  const [tables]=await admin.query('SHOW TABLES FROM '+sourceDatabase);
  for(const row of tables){
   const table=Object.values(row)[0]; assert.match(table,/^[a-zA-Z0-9_]+$/);
   await admin.query('CREATE TABLE '+testDatabase+'.'+table+' LIKE '+sourceDatabase+'.'+table);
  }
  process.env.DB_NAME=testDatabase;
  providerServer=http.createServer(async(req,res)=>{
   let raw=''; for await(const part of req) raw+=part;
   received=JSON.parse(raw);
   assert.equal(req.url,'/v1/messages');
   assert.equal(received.model,configuredModel);
   const screening = received.system.startsWith('RISK_CLASSIFIER_V1');
   if (!screening) assert.match(received.system,/ไม่เข้าข้างจนเกินไป/);
   const payload = screening ? JSON.parse(received.messages[0].content) : null;
   const context = screening ? payload.conversation_context : received.messages;
   assert.ok(context.length <= 20);
   assert.ok(context.every(m => Object.keys(m).sort().join(',') === 'content,role'));
   if (screening) assert.equal(payload.target_message, [...context].reverse().find(m=>m.role==='user')?.content);
   await new Promise(resolve=>setTimeout(resolve,120));
   res.setHeader('Content-Type','application/json');
   if(providerMode==='failure'){res.statusCode=503;res.end(JSON.stringify({error:{type:'service_unavailable'}}));}
   else if (!screening && providerMode==='reply-failure') {res.statusCode=503;res.end('{}');}
   else if (screening) {
    const target=payload.target_message;
    res.end(JSON.stringify({content:[{type:'text',text:providerMode==='invalid-screening' ? '{"self_harm":"false"}' : JSON.stringify({self_harm:target==='คืนนี้จะหายไปตลอดกาล',harm_others:false,imminent:false,uncertain:['ไม่แน่ใจว่าจะคุมตัวเองไหว','เทสๆ ทดสอบระบบ'].includes(target)})}]}));
   }
   else res.end(JSON.stringify({content:[{type:'thinking',thinking:'ignored'},{type:'text',text:'ได้ยินว่าคุณกำลังรู้สึกหนักใจ'},{type:'text',text:'อยากเล่าให้ฟังไหมว่าเกิดอะไรขึ้น'}]}));
  });
  process.env.MAXPLUS_BASE_URL=await listen(providerServer);
  process.env.MAXPLUS_API_PATH='';
  process.env.MAXPLUS_API_KEY='synthetic-test-key';
  pool=require('../src/config/db');
  const secret='Test-only-'+Date.now();
  const hash=await bcrypt.hash(secret,10);
  const ids={};
  for(const [name,role] of [['patient','user'],['unassigned','user'],['psychologist','psychologist'],['otherpsy','psychologist']]){
   const [r]=await pool.query('INSERT INTO users(username,email,password,first_name,last_name,role) VALUES(?,?,?,?,?,?)',[name,name+'@example.test',hash,name,'Test',role]);
   ids[name]=r.insertId;
   if(role==='psychologist')await pool.query('INSERT INTO psychologists(user_id,license_number) VALUES(?,?)',[r.insertId,'TEST-'+name]);
  }
  const app=require('../src/app');
  appServer=http.createServer(app);
  const base=await listen(appServer);
  async function request(route,token,method='GET',body){
   const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
   return {status:r.status,body:await r.json()};
  }
  const tokens={};
  for(const name of Object.keys(ids)){
   const r=await request('/auth/login',null,'POST',{email:name+'@example.test',password:secret});
   assert.equal(r.status,200);tokens[name]=r.body.token;
  }
  record('real login for synthetic User/Psychologist accounts');
  let r=await request('/chat/send',tokens.patient,'POST',{receiver_id:ids.psychologist,message:'ทดสอบการส่งข้อความผู้ใช้'});
  assert.equal(r.status,201);const sent=r.body.data;
  r=await request('/chat/list',tokens.psychologist);
  assert.ok(r.body.some(x=>x.id===ids.patient));
  r=await request('/chat/messages/'+ids.patient,tokens.psychologist);
  assert.ok(r.body.some(x=>x.id===sent.id));
  r=await request('/chat/send',tokens.psychologist,'POST',{receiver_id:ids.patient,message:'ทดสอบการตอบนักจิต'});
  assert.equal(r.status,201);
  r=await request('/chat/new?partner_id='+ids.psychologist+'&last_id='+sent.id,tokens.patient);
  assert.ok(r.body.some(x=>x.message==='ทดสอบการตอบนักจิต'));
  record('bidirectional chat, psychologist discovers first contact without appointment, polling');
  assert.equal((await request('/chat/send',tokens.patient,'POST',{receiver_id:ids.psychologist,message:' '})).status,400);
  assert.equal((await request('/chat/send',tokens.patient,'POST',{receiver_id:ids.unassigned,message:'invalid recipient'})).status,403);
  assert.equal((await request('/chat/messages/'+ids.patient,tokens.otherpsy)).status,403);
  record('input validation and unrelated psychologist access denied');
  const { detectRisk }=require('../src/services/chatSafety');
  for(const text of ['อยากตาย','ทำร้ายตัวเอง','ฉันจะทำร้ายคนอื่น','อยากฆ่าเขา','I want to kill myself','I want to hurt someone','อยาก ตาย'])assert.ok(detectRisk(text),text);
  assert.equal(detectRisk('วันนี้เครียดเรื่องสอบ'),false);
  record('self-harm and harm-to-others keyword screening');
  r=await request('/ai-chat/send',tokens.patient,'POST',{message:'วันนี้ฉันเครียดเรื่องสอบ'});
  assert.equal(r.status,201);assert.match(r.body.data.assistant_message.content,/หนักใจ/);
  assert.ok(!r.body.data.risk_alert);
  record('AI protocol, system prompt, multi-block reply and persisted history (stub provider)');
  providerMode='failure';
  const riskText='นี่คือข้อมูลทดสอบ ฉันอยากทำร้ายตัวเอง';
  r=await request('/ai-chat/send',tokens.patient,'POST',{message:riskText});
  assert.equal(r.status,502);const retryId=r.body.data.user_message.id;
  assert.equal(r.body.data.risk_alert.status,'queued_for_psychologist');
  const alertId=r.body.data.risk_alert.id;
  r=await request('/complaint/ai-alerts',tokens.psychologist);
  assert.ok(r.body.some(a=>a.id===alertId));
  assert.equal((await request('/complaint/ai-alerts/'+alertId+'/acknowledge',tokens.otherpsy,'PATCH')).status,404);
  assert.equal((await request('/complaint/ai-alerts/'+alertId+'/acknowledge',tokens.psychologist,'PATCH')).status,200);
  assert.ok(!(await request('/complaint/ai-alerts',tokens.psychologist)).body.some(a=>a.id===alertId));
  assert.equal((await request('/ai-chat/risk-alerts',tokens.psychologist)).status,200);
  record('risk alert delivery during provider outage, authorized acknowledgement, no missing-column query');
  providerMode='success';
  r=await request('/ai-chat/send',tokens.patient,'POST',{message:riskText,message_id:retryId});
  assert.equal(r.status,201);
  const [count]=await pool.query('SELECT COUNT(*) n FROM ai_chat_messages WHERE user_id=? AND role=\'user\' AND content=?',[ids.patient,riskText]);
  assert.equal(count[0].n,1);
  const [alerts]=await pool.query('SELECT COUNT(*) n FROM complaints WHERE sender_id=? AND type=\'ai_risk_alert\'',[ids.patient]);
  assert.equal(alerts[0].n,1);
  record('retry does not duplicate user message or risk alert');
  r=await request('/ai-chat/send',tokens.patient,'POST',{message:'ข้อมูลทดสอบ ฉันอยากฆ่าเขา'});
  assert.equal(r.status,201);assert.equal(r.body.data.risk_alert.status,'queued_for_psychologist');
  record('harm-to-others message alerts the psychologist');
  r=await request('/ai-chat/send',tokens.unassigned,'POST',{message:'ข้อมูลทดสอบ อยากตาย'});
  assert.equal(r.status,201);assert.equal(r.body.data.risk_alert.status,'unassigned');
  record('unassigned patient does not claim a psychologist was notified');
  const concurrent=await Promise.all([1,2].map(()=>request('/ai-chat/send',tokens.patient,'POST',{message:'concurrency fixture'})));
  assert.deepEqual(concurrent.map(x=>x.status).sort(),[201,409]);
  record('concurrent AI send protection');
  providerMode='reply-failure';
  r=await request('/ai-chat/send',tokens.patient,'POST',{message:'คืนนี้จะหายไปตลอดกาล'});
  assert.equal(r.status,502);
  assert.equal(r.body.data.screening.status,'completed');
  assert.equal(r.body.data.user_message.risk_flag,1);
  const semanticId=r.body.data.user_message.id;
  const semanticAlert=r.body.data.risk_alert.id;
  assert.ok((await request('/complaint/ai-alerts',tokens.psychologist)).body.some(a=>a.id===semanticAlert));
  const [beforeRetry]=await pool.query("SELECT COUNT(*) n FROM complaints WHERE sender_id=? AND type='ai_risk_alert'",[ids.patient]);
  providerMode='success';
  r=await request('/ai-chat/send',tokens.patient,'POST',{message:'คืนนี้จะหายไปตลอดกาล',message_id:semanticId});
  assert.equal(r.status,201);
  const [afterRetry]=await pool.query("SELECT COUNT(*) n FROM complaints WHERE sender_id=? AND type='ai_risk_alert'",[ids.patient]);
  assert.equal(afterRetry[0].n,beforeRetry[0].n);
  record('semantic risk alerts survive reply failure and retry without duplication');
  r=await request('/ai-chat/send',tokens.patient,'POST',{message:'ไม่แน่ใจว่าจะคุมตัวเองไหว'});
  assert.equal(r.status,201);assert.equal(r.body.data.screening.uncertain,true);
  assert.equal(r.body.data.risk_alert.status,'queued_for_psychologist');
  record('uncertain safety classification routes for human review');
  r=await request('/ai-chat/send',tokens.patient,'POST',{message:'เทสๆ ทดสอบระบบ'});
  assert.equal(r.status,201);assert.equal(r.body.data.screening.uncertain,false);
  assert.equal(r.body.data.screening.needsReview,false);assert.equal(r.body.data.risk_alert,null);
  record('generic Thai test message is not escalated, even when classifier returns uncertain and history contains risk content');
  providerMode='invalid-screening';
  r=await request('/ai-chat/send',tokens.patient,'POST',{message:'วันนี้อากาศดี'});
  assert.equal(r.status,201);assert.equal(r.body.data.screening.status,'unavailable');
  assert.equal(r.body.data.risk_alert,null);
  record('invalid classification is unavailable, never treated as a safe classification');
  providerMode='failure';
  r=await request('/ai-chat/send',tokens.patient,'POST',{message:'ทดสอบบริการล่ม'});
  assert.equal(r.status,502);assert.equal(r.body.data.screening.status,'unavailable');
  providerMode='success';
  record('provider outage preserves message and reports screening unavailable');
  for (let i=0;i<24;i++) await pool.query(
    "INSERT INTO ai_chat_messages(user_id,role,content,created_by,updated_by) VALUES(?,'user',?,?,?)",
    [ids.patient,'context-boundary-'+i,ids.patient,ids.patient]
  );
  r=await request('/ai-chat/send',tokens.patient,'POST',{message:'latest-context-boundary'});
  assert.equal(r.status,201);
  const sentContext=received.system.startsWith('RISK_CLASSIFIER_V1') ? JSON.parse(received.messages[0].content).conversation_context : received.messages;
  assert.equal(sentContext.length,20);
  assert.equal(sentContext[0].content,'context-boundary-5');
  assert.equal(sentContext.at(-1).content,'latest-context-boundary');
  record('only latest 20 messages sent, ordered oldest to newest, without account fields');

  if(process.argv.includes('--browser')){
   const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
   browser=await chromium.launch({headless:true,channel:'msedge'});
   async function context(name){
    const c=await browser.newContext({viewport:{width:1440,height:900}});
    await c.addInitScript(token=>localStorage.setItem('token',token),tokens[name]);
    await c.route('http://localhost:3000/api/**',route=>route.continue({url:route.request().url().replace('http://localhost:3000',base)}));
    return c;
   }
   const userContext=await context('patient'),psyContext=await context('psychologist');
   const userPage=await userContext.newPage(),psyPage=await psyContext.newPage();
   const errors=[];userPage.on('pageerror',e=>errors.push(e.message));psyPage.on('pageerror',e=>errors.push(e.message));
   const ui=process.env.TEST_UI_URL||'http://127.0.0.1:5188';
   await userPage.goto(ui+'/chat?partner_id='+ids.psychologist);
   await psyPage.goto(ui+'/chat?partner_id='+ids.patient);
   const userInput=userPage.getByRole('textbox',{name:'ข้อความถึงนักจิตวิทยา'});
   const psyInput=psyPage.getByRole('textbox',{name:'ข้อความถึงนักจิตวิทยา'});
   await userInput.fill('browser-user-to-psychologist');
   await userPage.getByRole('button',{name:'ส่งข้อความถึงนักจิตวิทยา',exact:true}).click();
   await psyPage.getByText('browser-user-to-psychologist',{exact:true}).waitFor({timeout:10000});
   await psyInput.fill('browser-psychologist-to-user');
   await psyPage.getByRole('button',{name:'ส่งข้อความถึงนักจิตวิทยา',exact:true}).click();
   await userPage.getByText('browser-psychologist-to-user',{exact:true}).waitFor({timeout:10000});
   record('browser two sessions: real send/read/poll both directions');
   await userPage.getByText('คุยกับ AI',{exact:true}).click();
   const aiInput=userPage.getByRole('textbox',{name:'ข้อความถึง AI'});
   await aiInput.fill('ข้อความทดสอบจากเบราว์เซอร์');
   await userPage.getByRole('button',{name:'ส่งข้อความถึง AI',exact:true}).click();
   await userPage.getByText('ข้อความทดสอบจากเบราว์เซอร์',{exact:true}).waitFor();
   providerMode='failure';
   await aiInput.fill('ข้อมูลทดสอบ จะทำร้ายคนอื่น');
   await userPage.getByRole('button',{name:'ส่งข้อความถึง AI',exact:true}).click();
   await userPage.getByRole('button',{name:'ลองขอคำตอบอีกครั้ง'}).waitFor();
   await psyPage.goto(ui+'/dashboard');
   await psyPage.getByText('ข้อมูลทดสอบ จะทำร้ายคนอื่น',{exact:true}).waitFor();
   providerMode='success';
   await userPage.getByRole('button',{name:'ลองขอคำตอบอีกครั้ง'}).click();
   await userPage.getByRole('button',{name:'ลองขอคำตอบอีกครั้ง'}).waitFor({state:'hidden'});
   assert.deepEqual(errors,[]);
   record('browser AI failure/retry and psychologist dashboard risk alert (stub provider)');
   await browser.close();browser=null;
  }
  if(process.argv.includes('--live')){
   process.env.MAXPLUS_BASE_URL=original.base;
   process.env.MAXPLUS_API_PATH=original.path;
   process.env.MAXPLUS_API_KEY=original.key;
   // Fresh synthetic user: never transmit existing health records to the provider.
   const [live]=await pool.query('INSERT INTO users(username,email,password,role) VALUES(?,?,?,?)',['livefixture','livefixture@example.test',hash,'user']);
   const login=await request('/auth/login',null,'POST',{email:'livefixture@example.test',password:secret});
   r=await request('/ai-chat/send',login.body.token,'POST',{message:'นี่เป็นข้อความทดสอบระบบ วันนี้รู้สึกเครียดกับการสอบ อยากให้ช่วยรับฟัง'});
   if(r.status!==201){
    results.push({name:'live MaxPlus '+configuredModel,pass:false,status:r.status,code:r.body.code});
    console.log('BLOCKED live MaxPlus: '+r.status+' '+r.body.code);
    process.exitCode=2;
   }else{
    assert.ok(r.body.data.assistant_message.content);
    assert.equal(r.body.data.screening.status,'completed');
    assert.equal(r.body.data.screening.needsReview,false);
    record('live MaxPlus '+configuredModel+' response');
    await request('/chat/send',login.body.token,'POST',{receiver_id:ids.psychologist,message:'เริ่มบทสนทนาจำลอง'});
    r=await request('/ai-chat/send',login.body.token,'POST',{message:'คืนนี้ตั้งใจจะหายไปจากโลกนี้ตลอดกาล เตรียมทุกอย่างไว้แล้ว ไม่อยากให้ใครมาห้าม'});
    assert.equal(r.status,201);
    assert.equal(r.body.data.screening.status,'completed');
    assert.equal(r.body.data.screening.needsReview,true);
    assert.equal(r.body.data.risk_alert.status,'queued_for_psychologist');
    assert.ok((await request('/complaint/ai-alerts',tokens.psychologist)).body.some(a=>a.id===r.body.data.risk_alert.id));
    record('live MaxPlus indirect Thai risk classification and psychologist alert delivery');
   }
  }
 } catch(error){console.error(error.stack);process.exitCode=1;}
 finally{
  if(browser)await browser.close();
  if(appServer){appServer.closeAllConnections();await new Promise(resolve=>appServer.close(resolve));}
  if(providerServer){providerServer.closeAllConnections();await new Promise(resolve=>providerServer.close(resolve));}
  if(pool)await pool.end();
  if(admin){assert.match(testDatabase,/^mental_chat_test_[0-9]+$/);assert.notEqual(testDatabase,sourceDatabase);await admin.query('DROP DATABASE IF EXISTS '+testDatabase);await admin.end();}
  console.log(JSON.stringify(results));
 }
})();
