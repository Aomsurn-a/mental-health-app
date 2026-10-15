// Read-only application smoke check; starts no background jobs and calls no AI.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
assert.equal(process.env.DB_HOST,'202.28.34.205');
assert.equal(process.env.DB_NAME,'db264');
const {tables}=require('./demo-data.cjs');
const dir=path.resolve(__dirname,'../../output/db264-demo');
const latest=fs.readdirSync(dir).filter(n=>fs.existsSync(path.join(dir,n,'COMMITTED.json'))).sort().at(-1);
assert(latest,'No committed demo run');
const accounts=JSON.parse(fs.readFileSync(path.join(dir,latest,'accounts.json'),'utf8'));
const report=JSON.parse(fs.readFileSync(path.join(dir,latest,'COMMITTED.json'),'utf8'));
const app=require('../src/app');
const db=require('../src/config/db');
const server=app.listen(0,'127.0.0.1',async()=>{
  try {
    for(const table of tables) {
      const [[r]]=await db.query('SELECT COUNT(*) n FROM `'+table+'`');
      assert.equal(r.n,report.counts[table],table+' committed count');
    }
    const base='http://127.0.0.1:'+server.address().port+'/api';
    for(const role of ['admin','psychologist','user']) {
      const account=accounts.find(a=>a.role===role&&a.status==='active');
      const response=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:account.email,password:account.password})});
      assert.equal(response.status,200,'Login '+role);
      const login=await response.json();assert.equal(login.user.role,role);
      const [[lastMood]]=await db.execute('SELECT DATE_FORMAT(MAX(mood_date),\'%Y-%m-%d\') day FROM mood_tracking WHERE user_id=?',[login.user.id]);
      const endpoints=role==='admin'?['/admin/stats']:role==='psychologist'?['/patient/']:['/assessment/sets','/assessment/my-results',...Array.from({length:4},(_,i)=>'/assessment/sets/'+(i+1)),'/mood/'+lastMood.day];
      for(const endpoint of endpoints) {
        const r=await fetch(base+endpoint,{headers:{Authorization:'Bearer '+login.token}});
        assert.equal(r.status,200,role+' '+endpoint);
        const result=await r.json();
        if(endpoint.startsWith('/assessment/sets/')) {
          assert(result.questions.every(q=>Array.isArray(q.answer_options)),'All question options must be arrays');
        }
        if(endpoint.startsWith('/mood/')) {
          assert.equal(typeof result.answers,'object');
          assert.equal(typeof result.answers.q1,'boolean');
        }
        if(endpoint==='/assessment/sets/4') {
          assert.equal(result.questions.length,8);
          console.log('8Q answer_options JS type: '+typeof result.questions[0].answer_options);
          assert(Array.isArray(result.questions[0].answer_options),'MariaDB JSON returned as text; assessment options need parsing');
          assert(result.questions[2].answer_options.some(o=>o.value===14));
        }
      }
      console.log('PASS '+role+' login and read endpoints');
    }
    console.log('PASS post-commit counts, roles, and assessment API');
  } catch(e) {console.error(e.message);process.exitCode=1;}
  finally {server.close();await db.end();}
});
