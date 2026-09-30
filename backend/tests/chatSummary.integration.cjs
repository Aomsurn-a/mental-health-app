const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const mysql=require('mysql2/promise'),jwt=require('jsonwebtoken');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const original={base:process.env.MAXPLUS_BASE_URL,key:process.env.MAXPLUS_API_KEY};
const source=process.env.DB_NAME,schema='mental_chatsummary_test_'+Date.now();
let admin,db,server,mock,browser,calls=0,payload,mode='success';
const listen=s=>new Promise(resolve=>s.listen(0,'127.0.0.1',()=>resolve('http://127.0.0.1:'+s.address().port)));
const pass=name=>console.log('PASS '+name);
(async()=>{try{
  assert.match(source,/^\w+$/);assert.match(schema,/^mental_chatsummary_test_\d+$/);
  admin=await mysql.createConnection({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD});
  await admin.query('CREATE DATABASE '+schema+' CHARACTER SET utf8mb4');
  const [tables]=await admin.query('SHOW TABLES FROM '+source);
  for(const row of tables){const name=Object.values(row)[0];assert.match(name,/^\w+$/);await admin.query('CREATE TABLE '+schema+'.'+name+' LIKE '+source+'.'+name);}
  process.env.DB_NAME=schema;db=require('../src/config/db');const users={},psys={};
  for(const[name,role]of [['patient','user'],['stranger','user'],['psych','psychologist'],['other','psychologist'],['admin','admin']]){
    const [u]=await db.query('INSERT INTO users(username,email,password,first_name,last_name,role) VALUES(?,?,?,?,?,?)',[name,name+'@example.test','synthetic-disabled',name,'Test',role]);users[name]=u.insertId;
    if(role==='psychologist'){const[p]=await db.query('INSERT INTO psychologists(user_id,license_number) VALUES(?,?)',[u.insertId,'TEST-'+name]);psys[name]=p.insertId;}
  }
  await db.query('INSERT INTO appointments(user_id,psychologist_id,appointment_date,appointment_time,status) VALUES(?,?,?,?,?)',[users.patient,psys.psych,'2026-08-01','10:00:00','completed']);
  const fixture=await db.getConnection();await fixture.query('SET time_zone=?',['+07:00']);
  for(const[sender,receiver,date,text,active]of [
    ['patient','psych','2026-08-31 23:59:59','นอนหลับไม่ดี',1],
    ['psych','patient','2026-08-01 00:00:00','ลองพักและจดสิ่งที่กังวล',1],
    ['patient','psych','2026-07-31 23:59:59','นอกช่วงก่อนหน้า',1],
    ['patient','psych','2026-09-01 00:00:00','นอกช่วงถัดไป',1],
    ['other','patient','2026-08-02 12:00:00','PRIVATE_OTHER_PAIR',1],
    ['patient','psych','2026-08-03 12:00:00','DELETED',0],
    ['stranger','psych','2026-08-04 12:00:00','NO_APPOINTMENT',1],
  ])await fixture.query('INSERT INTO chat_messages(sender_id,receiver_id,sent_at,message,active_flag) VALUES(?,?,?,?,?)',[users[sender],users[receiver],date,text,active]);
  await fixture.query('SET time_zone=?',['SYSTEM']);fixture.release();
  mock=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const j=JSON.parse(raw);calls++;
    assert.equal(j.model,'claude-sonnet-4-6');assert.equal(req.url,'/claude-native/v1/messages');payload=JSON.parse(j.messages[0].content);
    assert.ok(payload.every(m=>Object.keys(m).sort().join(',')==='speaker,text,time'));
    assert.ok(!raw.includes('PRIVATE_OTHER_PAIR')&&!raw.includes('DELETED')&&!raw.includes('@example.test'));
    res.setHeader('Content-Type','application/json');if(mode==='failure'){res.statusCode=503;res.end('{}');return;}
    res.end(JSON.stringify({content:[{type:'text',text:JSON.stringify({summary:mode==='invalid'?Array(6).fill('มากเกินไป'):['ผู้รับบริการกล่าวถึงความกังวลและการนอน','นักจิตวิทยาแนะนำให้จดสิ่งที่กังวล']})}]}));
  });process.env.MAXPLUS_BASE_URL=await listen(mock);process.env.MAXPLUS_API_KEY='synthetic';
  server=http.createServer(require('../src/app'));const base=await listen(server);const tokens={};
  for(const[name,id]of Object.entries(users))tokens[name]=jwt.sign({id,role:psys[name]?'psychologist':name==='admin'?'admin':'user'},process.env.JWT_SECRET);
  async function request(body,actor='psych',patient=users.patient){const r=await fetch(base+'/api/psychologist/chat/'+patient+'/summarize',{method:'POST',headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+tokens[actor]}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
  assert.equal((await request({lastNMessages:5},null)).status,401);
  for(const actor of ['patient','other','admin'])assert.equal((await request({lastNMessages:5},actor)).status,403);
  assert.equal((await request({lastNMessages:5},'psych',users.stranger)).status,403);assert.equal(calls,0);pass('auth, role and appointment required even when conversation exists');
  for(const body of [{},{lastNMessages:0},{lastNMessages:'5'},{lastNMessages:1.5},{startDate:'2026-02-30',endDate:'2026-03-01'},{startDate:'2026-08-31',endDate:'2026-08-01'},{lastNMessages:5,startDate:'2026-08-01',endDate:'2026-08-31'}])assert.equal((await request(body)).status,400);
  assert.equal((await request({lastNMessages:201})).status,422);pass('exclusive input modes, real dates and N limits');
  let r=await request({startDate:'2026-08-01',endDate:'2026-08-31'});assert.equal(r.status,200);assert.equal(r.body.messageCount,2);
  assert.deepEqual(payload.map(m=>m.text),['ลองพักและจดสิ่งที่กังวล','นอนหลับไม่ดี']);assert.equal(payload[0].speaker,'psychologist');assert.equal(payload[1].speaker,'patient');
  assert.equal(r.body.dateRange.to,'2026-08-31T23:59:59+07:00');pass('Thai date boundaries, pair isolation, deleted exclusion and chronological order');
  r=await request({lastNMessages:2});assert.equal(r.body.messageCount,2);assert.equal(payload[0].text,'นอนหลับไม่ดี');assert.equal(payload[1].text,'นอกช่วงถัดไป');
  const previousCalls=calls;await request({lastNMessages:2});assert.equal(calls,previousCalls+1);pass('latest N reordered oldest-first and no caching');
  const beforeEmpty=calls;assert.equal((await request({startDate:'2025-01-01',endDate:'2025-01-31'})).status,404);assert.equal(calls,beforeEmpty);pass('empty selection avoids AI');
  for(let n=0;n<201;n++)await db.query('INSERT INTO chat_messages(sender_id,receiver_id,message,sent_at) VALUES(?,?,?,?)',[users.patient,users.psych,'ข้อมูลจำลองข้อความ '+n,'2026-08-15 12:00:00']);
  const beforeLimit=calls;assert.equal((await request({startDate:'2026-08-01',endDate:'2026-08-31'})).status,422);assert.equal(calls,beforeLimit);pass('over 200 rejected before AI rather than silently truncated');
  mode='invalid';assert.equal((await request({lastNMessages:5})).status,502);mode='failure';assert.equal((await request({lastNMessages:5})).status,502);mode='success';pass('malformed output and provider failure produce actionable errors');
  if(process.argv.includes('--browser')){
    const {chromium}=require(process.env.PLAYWRIGHT_PATH);browser=await chromium.launch({headless:true,channel:'msedge'});
    const c=await browser.newContext();await c.addInitScript(token=>localStorage.setItem('token',token),tokens.psych);
    await c.route('http://localhost:3000/api/**',route=>route.continue({url:route.request().url().replace('http://localhost:3000',base)}));
    const page=await c.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto((process.env.TEST_UI_URL||'http://127.0.0.1:5188')+'/chat?partner_id='+users.patient);
    await page.getByRole('button',{name:'สรุปแชทให้หน่อย',exact:true}).click();await page.getByRole('button',{name:'สรุปข้อความ',exact:true}).click();await page.getByRole('region',{name:'ผลสรุปแชท'}).waitFor();
    for(const[name,width,height]of [['desktop',1440,1000],['mobile',390,844]]){await page.setViewportSize({width,height});await page.screenshot({path:path.join(__dirname,'../../.impeccable/review/chat-summary-'+name+'.png'),fullPage:true,animations:'disabled'});assert.equal(await page.locator('.chat-summary-form').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);}
    mode='failure';await page.getByRole('button',{name:'สรุปข้อความ',exact:true}).click();await page.getByRole('alert').filter({hasText:'ไม่สามารถสรุปแชทได้'}).waitFor();mode='success';
    await page.getByRole('combobox',{name:'เลือกข้อความที่ต้องการสรุป'}).click();await page.getByText('เลือกช่วงวันที่เอง',{exact:true}).click();
    await page.getByPlaceholder('วันเริ่มต้น').fill('01/08/2026');await page.getByPlaceholder('วันเริ่มต้น').press('Tab');
    await page.getByPlaceholder('วันสิ้นสุด').fill('31/08/2026');await page.getByPlaceholder('วันสิ้นสุด').press('Tab');
    await page.getByRole('button',{name:'สรุปข้อความ',exact:true}).click();await page.getByRole('alert').filter({hasText:'ช่วงที่เลือกมีข้อความเยอะเกินไป'}).waitFor();assert.deepEqual(errors,[]);pass('desktop/mobile modal, summary, custom date and inline errors');
  }
  if(process.argv.includes('--live')){process.env.MAXPLUS_BASE_URL=original.base;process.env.MAXPLUS_API_KEY=original.key;r=await request({lastNMessages:5});assert.equal(r.status,200,JSON.stringify(r.body));assert.ok(r.body.summary.length<=5);console.log('LIVE SUMMARY:',JSON.stringify(r.body));pass('live Sonnet 4.6 structured summary');}
}catch(error){console.error(error.stack);process.exitCode=1;}finally{
  if(browser)await browser.close();for(const s of [server,mock])if(s){s.closeAllConnections();await new Promise(r=>s.close(r));}if(db)await db.end();if(admin){assert.match(schema,/^mental_chatsummary_test_\d+$/);assert.notEqual(schema,source);await admin.query('DROP DATABASE IF EXISTS '+schema);await admin.end();}
}})();
