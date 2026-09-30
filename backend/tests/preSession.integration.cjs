const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const mysql=require('mysql2/promise'),jwt=require('jsonwebtoken');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const original={base:process.env.MAXPLUS_BASE_URL,key:process.env.MAXPLUS_API_KEY};
const source=process.env.DB_NAME,schema='mental_presession_test_'+Date.now();
let admin,db,server,mock,mode='success',calls=0,lastContext,browser;
const listen=s=>new Promise(r=>s.listen(0,'127.0.0.1',()=>r('http://127.0.0.1:'+s.address().port)));
const pass=s=>console.log('PASS '+s);
(async()=>{try{
  assert.match(source,/^\w+$/);assert.match(schema,/^mental_presession_test_\d+$/);
  admin=await mysql.createConnection({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD});
  await admin.query('CREATE DATABASE '+schema+' CHARACTER SET utf8mb4');
  const [tables]=await admin.query('SHOW TABLES FROM '+source);
  for(const row of tables){const table=Object.values(row)[0];assert.match(table,/^\w+$/);if(table!=='patient_session_summaries')await admin.query('CREATE TABLE '+schema+'.'+table+' LIKE '+source+'.'+table);}
  process.env.DB_NAME=schema;db=require('../src/config/db');
  for(const file of ['migration_trend_analysis.sql','migration_pre_session.sql','migration_pre_session.sql'])await db.query(fs.readFileSync(path.join(__dirname,'../../Data',file),'utf8'));
  const users={},psys={};
  for(const [name,role] of [['patient','user'],['empty','user'],['psych','psychologist'],['other','psychologist'],['admin','admin']]){
    const [u]=await db.query('INSERT INTO users(username,email,password,role,first_name,last_name) VALUES(?,?,?,?,?,?)',[name,name+'@example.test','disabled-synthetic',role,name,'Test']);users[name]=u.insertId;
    if(role==='psychologist'){const[p]=await db.query('INSERT INTO psychologists(user_id,license_number) VALUES(?,?)',[u.insertId,'TEST-'+name]);psys[name]=p.insertId;}
  }
  const [pat]=await db.query('INSERT INTO patients(user_id) VALUES(?)',[users.patient]);
  const calc=require('../src/services/trendCalculationService'),today=calc.bangkokDate();
  for(const name of ['patient','empty'])await db.query('INSERT INTO appointments(user_id,psychologist_id,appointment_date,appointment_time,status) VALUES(?,?,?,?,?)',[users[name],psys.psych,today,'09:00:00','completed']);
  for(let n=1;n<=12;n++)await db.query('INSERT INTO patient_records(patient_id,psychologist_id,session_number,symptoms,treatment,treatment_date) VALUES(?,?,?,?,?,?)',[pat.insertId,psys.psych,n,'อาการจำลองครั้ง '+n,'ติดตามอาการ',calc.shiftDate(today,n-13)]);
  await db.query('INSERT INTO assessment_sets(id,name) VALUES(?,?)',[1,'ST-5']);
  for(const [score,level,date] of [[5,'medium',-2],[10,'high',-1]])await db.query('INSERT INTO assessment_results(user_id,set_id,score,risk_level,taken_at) VALUES(?,?,?,?,?)',[users.patient,1,score,level,calc.shiftDate(today,date)+' 12:00:00']);
  for(const day of [-1,0])await db.query('INSERT INTO mood_tracking(user_id,mood_date,mood_score,note) VALUES(?,?,?,?)',[users.patient,calc.shiftDate(today,day),2,'DO_NOT_SEND_NOTE']);
  await db.query('INSERT INTO mood_pattern_alerts(patient_id,psychologist_id,alert_type,message,episode_date,raw_numbers) VALUES(?,?,?,?,?,?)',[users.patient,psys.psych,'mood_drop','ข้อความแจ้งเตือนเดิมจากหมวดสอง',today,'{"consecutive_days":3,"threshold":2}']);
  mock=http.createServer(async(req,res)=>{let body='';for await(const part of req)body+=part;const j=JSON.parse(body);calls++;
    assert.equal(req.url,'/claude-native/v1/messages');assert.equal(j.model,'claude-sonnet-4-6');
    lastContext=JSON.parse(j.messages[0].content);assert.ok(lastContext.records.length<=10);assert.ok(!body.includes('DO_NOT_SEND_NOTE'));assert.ok(!body.includes('@example.test'));
    await new Promise(r=>setTimeout(r,100));res.setHeader('Content-Type','application/json');
    if(mode==='failure'){res.statusCode=503;res.end('{}');}else res.end(JSON.stringify({content:[{type:'text',text:'สรุปข้อมูลจำลอง: ผู้รับบริการมีความเครียดต่อเนื่อง ควรทบทวนประวัติประกอบการพูดคุยในครั้งนี้'}]}));
  });
  process.env.MAXPLUS_BASE_URL=await listen(mock);process.env.MAXPLUS_API_KEY='synthetic-key';
  server=http.createServer(require('../src/app'));const base=await listen(server);
  const tokens={};for(const[name,id]of Object.entries(users))tokens[name]=jwt.sign({id,role:psys[name]?'psychologist':name==='admin'?'admin':'user'},process.env.JWT_SECRET);
  async function request(suffix,name='psych',method='GET',id=users.patient){const r=await fetch(base+'/api/psychologist/patients/'+id+'/'+suffix,{method,headers:name?{Authorization:'Bearer '+tokens[name]}:{}});return{status:r.status,body:await r.json()};}
  for(const suffix of ['session-summary','risk-bullets']){
    assert.equal((await request(suffix,null)).status,401);for(const role of ['patient','other','admin'])assert.equal((await request(suffix,role)).status,403);
  }assert.equal(calls,0);pass('auth and ownership before any AI/cache access');
  let r=await request('risk-bullets');assert.equal(r.status,200);assert.equal(r.body.bullets.length,2);assert.ok(r.body.bullets.some(b=>b.text==='ข้อความแจ้งเตือนเดิมจากหมวดสอง'));assert.equal(calls,0);pass('risk bullets reuse alerts/trend with zero AI calls');
  r=await request('session-summary');assert.equal(r.status,200);assert.equal(r.body.based_on_records_count,10);assert.equal(r.body.cached,false);
  assert.equal(lastContext.records[0].session_number,3);assert.equal(lastContext.records.at(-1).session_number,12);assert.equal(lastContext.latest_assessments[0].score,10);assert.equal(lastContext.mood_30_days.average,2);
  r=await request('session-summary');assert.equal(r.body.cached,true);assert.equal(calls,1);pass('latest ten records, latest assessment per set, existing mood calculation, persistent cache');
  let count=calls;await request('session-summary','psych','POST');assert.equal(calls,count+1);pass('manual refresh');
  count=calls;const concurrent=await Promise.all([1,2,3].map(()=>request('session-summary','psych','POST')));assert.ok(concurrent.every(r=>r.status===200));assert.equal(calls,count+1);pass('concurrent requests share one AI call');
  count=calls;await db.query('INSERT INTO appointments(user_id,psychologist_id,appointment_date,appointment_time,status) VALUES(?,?,?,?,?)',[users.patient,psys.psych,today,'10:00:00','approved']);await request('session-summary');assert.equal(calls,count+1);
  count=calls;await db.query('INSERT INTO patient_records(patient_id,psychologist_id,session_number,symptoms,treatment_date) VALUES(?,?,?,?,?)',[pat.insertId,psys.psych,13,'บันทึกใหม่',today]);await request('session-summary');assert.equal(calls,count+1);pass('new appointment and new record invalidate cache even at ten-record limit');
  count=calls;await db.query('UPDATE patient_records SET symptoms=? WHERE patient_id=? AND session_number=?',['แก้ไขบันทึก',pat.insertId,13]);await request('session-summary');assert.equal(calls,count+1);pass('record edits invalidate cache');
  mode='failure';r=await request('session-summary','psych','POST');assert.equal(r.status,503);assert.equal(r.body.message,'ไม่สามารถสรุปได้ในขณะนี้');r=await request('session-summary');assert.equal(r.body.cached,true);pass('provider error preserves cache and returns UI error');mode='success';
  count=calls;r=await request('session-summary','psych','GET',users.empty);assert.equal(r.body.empty,true);assert.equal(calls,count);assert.deepEqual((await request('risk-bullets','psych','GET',users.empty)).body.bullets,[]);pass('empty history makes no AI call and no false safe message');
  await db.query('UPDATE mood_pattern_alerts SET acknowledged=? WHERE patient_id=?',[1,users.patient]);r=await request('risk-bullets');assert.equal(r.body.bullets.length,1);pass('acknowledged alerts excluded');
  if(process.argv.includes('--browser')){
    const {chromium}=require(process.env.PLAYWRIGHT_PATH);browser=await chromium.launch({headless:true,channel:'msedge'});
    const c=await browser.newContext();await c.addInitScript(token=>localStorage.setItem('token',token),tokens.psych);
    await c.route('http://localhost:3000/api/**',route=>route.continue({url:route.request().url().replace('http://localhost:3000',base)}));
    const page=await c.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.TEST_UI_URL||'http://127.0.0.1:5188');await page.goto((process.env.TEST_UI_URL||'http://127.0.0.1:5188')+'/patients');
    await page.getByRole('button',{name:'ดูประวัติ patient Test'}).click();await page.getByText('สรุปข้อมูลจำลอง:',{exact:false}).waitFor();
    for(const [name,width,height]of [['desktop',1440,1000],['mobile',390,844]]){await page.setViewportSize({width,height});await page.screenshot({path:path.join(__dirname,'../../.impeccable/review/pre-session-'+name+'.png'),fullPage:true,animations:'disabled'});const overflow=await page.locator('.pre-session').evaluate(el=>el.scrollWidth>el.clientWidth+1);assert.equal(overflow,false);}
    mode='failure';await page.getByRole('button',{name:'สรุปใหม่',exact:true}).click();await page.getByText('ไม่สามารถสรุปได้ในขณะนี้',{exact:true}).waitFor();assert.ok(await page.getByRole('tab',{name:/ผลประเมิน/}).isVisible());
    mode='success';await page.getByRole('button',{name:'สรุปใหม่',exact:true}).click();await page.getByText('สรุปข้อมูลจำลอง:',{exact:false}).waitFor();assert.deepEqual(errors,[]);pass('desktop/mobile profile, error recovery and existing tabs');
  }
  if(process.argv.includes('--live')){process.env.MAXPLUS_BASE_URL=original.base;process.env.MAXPLUS_API_KEY=original.key;r=await request('session-summary','psych','POST');assert.equal(r.status,200,JSON.stringify(r.body));assert.ok(r.body.summary_text);console.log('LIVE SUMMARY:',r.body.summary_text);pass('live Sonnet 4.6 summary using synthetic records');}
}catch(e){console.error(e.stack);process.exitCode=1;}finally{
  if(browser)await browser.close();for(const s of[server,mock])if(s){s.closeAllConnections();await new Promise(r=>s.close(r));}if(db)await db.end();
  if(admin){assert.match(schema,/^mental_presession_test_\d+$/);assert.notEqual(schema,source);await admin.query('DROP DATABASE IF EXISTS '+schema);await admin.end();}
}})();
