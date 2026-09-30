const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const original = { base: process.env.MAXPLUS_BASE_URL, apiPath: process.env.MAXPLUS_API_PATH, key: process.env.MAXPLUS_API_KEY };
const source = process.env.DB_NAME, schema = 'mental_trend_test_' + Date.now();
let admin, db, apiServer, mock, mode = 'success', calls = [];
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve('http://127.0.0.1:' + server.address().port)));
const pass = label => console.log('PASS ' + label);
(async () => {
  try {
    assert.match(source, /^\w+$/); assert.match(schema, /^mental_trend_test_\d+$/);
    admin = await mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD });
    await admin.query('CREATE DATABASE ' + schema + ' CHARACTER SET utf8mb4');
    const [tables] = await admin.query('SHOW TABLES FROM ' + source);
    for (const row of tables) {
      const table = Object.values(row)[0]; assert.match(table, /^\w+$/);
      if (table !== 'mood_pattern_alerts') await admin.query('CREATE TABLE ' + schema + '.' + table + ' LIKE ' + source + '.' + table);
    }
    process.env.DB_NAME = schema;
    db = require('../src/config/db');
    const migration = fs.readFileSync(path.join(__dirname, '../../Data/migration_trend_analysis.sql'), 'utf8');
    await db.query(migration); await db.query(migration);
    pass('migration is repeatable');
    const users = {}, psychologists = {};
    for (const [name, role] of [['patient','user'],['gap','user'],['empty','user'],['psych','psychologist'],['other','psychologist'],['admin','admin']]) {
      const [r] = await db.query('INSERT INTO users(username,email,password,role) VALUES(?,?,?,?)', [name,name+'@example.test','disabled-synthetic-password',role]);
      users[name] = r.insertId;
      if (role === 'psychologist') {
        const [p] = await db.query('INSERT INTO psychologists(user_id,license_number) VALUES(?,?)', [r.insertId,'TEST-'+name]);
        psychologists[name] = p.insertId;
      }
    }
    const calc = require('../src/services/trendCalculationService'), today = calc.bangkokDate();
    for (const name of ['patient','gap','empty']) await db.query(
      'INSERT INTO appointments(user_id,psychologist_id,appointment_date,appointment_time,status) VALUES(?,?,?,?,?)',
      [users[name],psychologists.psych,today,'08:00:00','completed']);
    for (const id of [1,2]) await db.query('INSERT INTO assessment_sets(id,name) VALUES(?,?)', [id,id===1?'ST-5':'2Q']);
    for (const [set, score, day] of [[1,10,-2],[1,5,-1],[2,0,-2],[2,2,-1]]) await db.query(
      'INSERT INTO assessment_results(user_id,set_id,score,taken_at) VALUES(?,?,?,?)',
      [users.patient,set,score,calc.shiftDate(today,day)+' 12:00:00']);
    for (const day of [-2,-1,0,-15]) await db.query(
      'INSERT INTO mood_tracking(user_id,mood_date,mood_score,note) VALUES(?,?,?,?)',
      [users.patient,calc.shiftDate(today,day),day===-15?4:2,'บันทึกจำลอง']);
    for (const day of [-15,-14,-13,-12]) await db.query(
      'INSERT INTO mood_tracking(user_id,mood_date,mood_score) VALUES(?,?,?)',[users.gap,calc.shiftDate(today,day),4]);
    mock = http.createServer(async (req,res) => {
      let body=''; for await (const chunk of req) body+=chunk;
      const request=JSON.parse(body);calls.push(request);
      assert.equal(request.model,'claude-haiku-4-5-20251001');
      assert.equal(req.url,'/v1/messages');
      const payload=JSON.parse(request.messages[0].content);
      assert.ok(payload.raw_numbers);assert.ok(!payload.user_id && !payload.patient_id);
      if (payload.notes) assert.ok(request.system.startsWith('สรุปแนวโน้มอารมณ์'));
      res.setHeader('Content-Type','application/json');
      if(mode==='failure'){res.statusCode=503;res.end('{}');return;}
      res.end(JSON.stringify({content:[{type:'text',text:mode==='bad-number'?'คะแนน 99999':'ข้อมูลมีแนวโน้มเปลี่ยนแปลง กรุณาทบทวนข้อมูลประกอบการติดตาม'}]}));
    });
    process.env.MAXPLUS_BASE_URL=await listen(mock);process.env.MAXPLUS_API_PATH='';process.env.MAXPLUS_API_KEY='synthetic';
    apiServer=http.createServer(require('../src/app'));const base=await listen(apiServer);
    const tokens={};for(const [name,id] of Object.entries(users)) tokens[name]=jwt.sign({id,role:psychologists[name]?'psychologist':name==='admin'?'admin':'user'},process.env.JWT_SECRET);
    const request=async(route,name='psych',method='GET')=>{
      const response=await fetch(base+'/api/psychologist'+route,{method,headers:name?{Authorization:'Bearer '+tokens[name]}:{}});
      return {status:response.status,body:await response.json()};
    };
    const assessment='/patients/'+users.patient+'/assessment-trend', mood='/patients/'+users.patient+'/mood-trend';
    assert.equal((await request(assessment,null)).status,401);
    for(const name of ['patient','admin','other']) assert.equal((await request(assessment,name)).status,403);
    assert.equal(calls.length,0);pass('authentication, role and patient ownership checked before AI');
    let r=await request(assessment);assert.equal(r.status,200);assert.equal(r.body.raw_numbers.sets[0].percent_change,-50);assert.ok(r.body.ai_summary);
    assert.equal(r.body.raw_numbers.sets[1].percent_change,null);pass('assessment grouping and zero denominator');
    r=await request(mood);assert.equal(r.body.raw_numbers.current_average,2);assert.equal(r.body.raw_numbers.previous_average,4);
    assert.deepEqual(JSON.parse(calls.at(-1).messages[0].content).notes,['บันทึกจำลอง','บันทึกจำลอง','บันทึกจำลอง']);pass('mood averages and notes only on mood interpretation');
    for(const value of ['0','-1','91','1.5','abc']) assert.equal((await request(mood+'?days='+value)).status,400);
    assert.equal((await request('/alerts?acknowledged=invalid')).status,400);pass('query validation');
    r=await request('/patients/'+users.empty+'/mood-trend');assert.equal(r.body.raw_numbers.current_average,null);assert.ok(!('ai_summary' in r.body));
    mode='failure';r=await request(assessment);assert.equal(r.status,200);assert.ok(r.body.raw_numbers);assert.ok(!('ai_summary' in r.body));
    mode='bad-number';r=await request(mood);assert.equal(r.status,200);assert.ok(!('ai_summary' in r.body));pass('empty data, provider outage and unsupported AI numbers preserve raw_numbers');
    const {runPatternDetection}=require('../src/jobs/patternDetectionJob');
    let stats=await runPatternDetection({db,today,dryRun:true});assert.equal(stats.detected,2);assert.equal(stats.created,0);
    mode='failure';stats=await runPatternDetection({db,today});assert.equal(stats.created,2);assert.equal(stats.fallback,2);assert.equal(stats.failed,0);
    stats=await runPatternDetection({db,today});assert.equal(stats.created,0);assert.equal(stats.duplicate,2);
    pass('daily rules include long gaps, dry-run is read-only, fallback alerts and deduplication');
    r=await request('/alerts');assert.equal(r.body.length,2);assert.ok(r.body.every(a=>a.message_source==='rule'));
    const alertId=r.body[0].id;
    assert.equal((await request('/alerts','other')).body.length,0);
    assert.equal((await request('/alerts/'+alertId+'/acknowledge','other','PUT')).status,404);
    assert.equal((await request('/alerts/'+alertId+'/acknowledge','psych','PUT')).status,200);
    assert.equal((await request('/alerts/'+alertId+'/acknowledge','psych','PUT')).status,200);
    assert.equal((await request('/alerts?acknowledged=true')).body.length,1);
    stats=await runPatternDetection({db,today});assert.equal(stats.created,0);pass('owner-only acknowledgement and no alert recreation after acknowledgement');
    const connection=await db.getConnection();
    await connection.query('SELECT GET_LOCK(?,0)', ['mood_patterns:'+schema]);
    try {assert.equal((await runPatternDetection({db,today})).skipped,'already_running');}
    finally {await connection.query('SELECT RELEASE_LOCK(?)',['mood_patterns:'+schema]);connection.release();}
    pass('multi-process database job lock');
    if(process.argv.includes('--live')){
      process.env.MAXPLUS_BASE_URL=original.base;process.env.MAXPLUS_API_PATH=original.apiPath||'';process.env.MAXPLUS_API_KEY=original.key;
      const ai=require('../src/services/aiInterpretationService');
      const summary=await ai.interpret('mood',{current_average:2,previous_average:4,difference:-2,percent_change:-50,direction:'worsening',current_count:3,previous_count:3},['ช่วงนี้เครียดกับการสอบ']);
      assert.ok(summary,'Live Haiku did not return an accepted summary; raw_numbers fallback remains operational');
      console.log('LIVE summary:',summary);pass('live Haiku with synthetic calculated metrics');
    }
  }catch(error){console.error(error.stack);process.exitCode=1;}
  finally{
    for(const server of [apiServer,mock]) if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
    if(db) await db.end();
    if(admin){assert.match(schema,/^mental_trend_test_\d+$/);assert.notEqual(schema,source);await admin.query('DROP DATABASE IF EXISTS '+schema);await admin.end();}
  }
})();
