// Default is a read-only preview. --replace-db264 explicitly replaces db264 data.
// Never prints passwords, existing patient rows, or connection credentials.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const {build,validate,tables} = require('./demo-data.cjs');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const root=path.resolve(__dirname,'../..');
const apply=process.argv.includes('--replace-db264');
const quote=mysql.escapeId;
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
function checkedWrite(file,content) {
  fs.writeFileSync(file,content,{encoding:'utf8',flag:'wx'});
  assert.equal(digest(fs.readFileSync(file)),digest(content),'Backup readback mismatch');
}
function sqlInsert(table,rows) {
  return rows.map(row=>{
    const keys=Object.keys(row);
    return 'INSERT INTO '+quote(table)+' ('+keys.map(quote).join(',')+') VALUES ('+keys.map(k=>mysql.escape(row[k])).join(',')+');';
  }).join('\n');
}
async function insert(c,table,rows) {
  if(!rows.length) return;
  const keys=Object.keys(rows[0]);
  for(let offset=0;offset<rows.length;offset+=100) {
    const batch=rows.slice(offset,offset+100);
    for(const row of batch) assert.deepEqual(Object.keys(row).sort(),[...keys].sort(),'Inconsistent row fields');
    const tuple='('+keys.map(()=>'?').join(',')+')';
    await c.query('INSERT INTO '+quote(table)+' ('+keys.map(quote).join(',')+') VALUES '+batch.map(()=>tuple).join(','),batch.flatMap(row=>keys.map(k=>row[k])));
  }
}
async function main() {
  assert.equal(process.env.DB_HOST,'202.28.34.205','Refusing non-authorized DB host');
  assert.equal(process.env.DB_NAME,'db264','Refusing non-authorized DB name');
  assert.equal(Number(process.env.DB_PORT||3306),3306,'Unexpected port');
  const c=await mysql.createConnection({host:process.env.DB_HOST,port:3306,user:process.env.DB_USER,
    password:process.env.DB_PASSWORD,database:'db264',dateStrings:true,charset:'utf8mb4',connectTimeout:10000});
  let committed=false,transaction=false,backupDir;
  try {
    await c.query("SET time_zone = '+07:00'");
    await c.query("SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION'");
    await c.query('SET SESSION innodb_lock_wait_timeout = 10');
    const [[identity]]=await c.query('SELECT DATABASE() db, @@foreign_key_checks fk');
    assert.equal(identity.db,'db264'); assert.equal(identity.fk,1);
    const [status]=await c.query('SHOW TABLE STATUS');
    assert.deepEqual(status.map(t=>t.Name).sort(),[...tables].sort(),'Unexpected tables: inspect before replacing');
    assert(status.every(t=>t.Engine==='InnoDB'),'Only transactional tables allowed');
    const [triggers]=await c.query('SHOW TRIGGERS');
    assert.equal(triggers.length,0,'Triggers require manual review');
    const [foreignKeys]=await c.execute('SELECT TABLE_NAME t,COLUMN_NAME col,REFERENCED_TABLE_NAME parent,REFERENCED_COLUMN_NAME parent_col FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL',['db264']);
    const order=[];
    while(order.length<tables.length) {
      const next=tables.find(t=>!order.includes(t)&&foreignKeys.filter(f=>f.t===t).every(f=>order.includes(f.parent)));
      assert(next,'Cyclic or unknown foreign key'); order.push(next);
    }
    const schema={};
    for(const t of order) {
      const [r]=await c.query('SHOW CREATE TABLE '+quote(t));schema[t]=r[0]['Create Table'];
    }
    // In REPEATABLE READ these full-table locking reads also lock gaps, preventing
    // app inserts/updates during the snapshot and replace. No TRUNCATE/DDL/implicit commit.
    await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await c.beginTransaction(); transaction=true;
    const old={},counts={};
    for(const t of order) {
      if(apply) { const [rows]=await c.query('SELECT * FROM '+quote(t)+' ORDER BY id FOR UPDATE');old[t]=rows;counts[t]=rows.length; }
      else { const [[r]]=await c.query('SELECT COUNT(*) n FROM '+quote(t)); counts[t]=r.n; }
    }
    const [[max]]=await c.query('SELECT COALESCE(MAX(id),0) n FROM users');
    // Never recycle user IDs: old JWTs must not authenticate as newly seeded accounts.
    const userBase=Math.max(Number(max.n),Number(status.find(t=>t.Name==='users').Auto_increment||0))+100;
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const password='Demo!'+crypto.randomBytes(12).toString('base64url');
    const hash=await bcrypt.hash(password,10);
    const {data,archetypes}=build({today,userBase,hash});
    const expected=validate(data);
    for(const f of foreignKeys) for(const row of data[f.t]) {
      if(row[f.col]!=null) assert(data[f.parent].some(p=>p[f.parent_col]===row[f.col]),'Bad generated FK '+f.t+'.'+f.col);
    }
    console.log(JSON.stringify({mode:apply?'replace':'preview',target:'202.28.34.205:3306/db264',today,userBase,before:counts,after:expected},null,2));
    if(!apply) { await c.rollback();transaction=false;return; }
    const run=new Date().toISOString().replace(/[:.]/g,'-');
    backupDir=path.join(root,'output/db264-backups',run);
    const demoDir=path.join(root,'output/db264-demo',run);
    fs.mkdirSync(backupDir,{recursive:true});fs.mkdirSync(demoDir,{recursive:true});
    const header="-- db264 only. Recovery data; contains private information. Do not publish.\nUSE `db264`;\nSET NAMES utf8mb4;\nSET time_zone = '+07:00';\nSET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION';\nSTART TRANSACTION;\n";
    const deletes=[...order].reverse().map(t=>'DELETE FROM '+quote(t)+';').join('\n')+'\n';
    const snapshot=JSON.stringify({database:'db264',counts,schema,data:old},null,2);
    checkedWrite(path.join(backupDir,'snapshot.json'),snapshot);
    const restore=header+deletes+order.map(t=>sqlInsert(t,old[t])).join('\n')+'\nCOMMIT;\n';
    checkedWrite(path.join(backupDir,'restore-data.sql'),restore);
    checkedWrite(path.join(backupDir,'schema.sql'),order.map(t=>schema[t]+';').join('\n'));
    checkedWrite(path.join(backupDir,'checksums.json'),JSON.stringify({snapshot:digest(snapshot),restore:digest(restore)},null,2));
    checkedWrite(path.join(demoDir,'seed-data.sql'),header.replace('Recovery data; contains private information.','Synthetic demonstration data.')+deletes+order.map(t=>sqlInsert(t,data[t])).join('\n')+'\nCOMMIT;\n');
    const accounts=data.users.map(u=>({email:u.email,password,role:u.role,name:u.first_name+' '+u.last_name,status:u.status,
      scenario:u.role==='user'?archetypes[(u.id-userBase-8)%6]:''}));
    checkedWrite(path.join(demoDir,'accounts.json'),JSON.stringify(accounts,null,2));
    console.log('Verified backup: '+backupDir);
    for(const t of [...order].reverse()) await c.query('DELETE FROM '+quote(t));
    for(const t of order) await insert(c,t,data[t]);
    const actual={};
    for(const t of order) {
      const [rows]=await c.query('SELECT * FROM '+quote(t)+' ORDER BY id');actual[t]=rows;
      assert.equal(rows.length,expected[t],'Count mismatch '+t);
      const byId=new Map(rows.map(r=>[r.id,r]));
      for(const wanted of data[t]) for(const key of Object.keys(wanted))
        assert.equal(String(byId.get(wanted.id)[key]),String(wanted[key]),'Value mismatch '+t+'.'+key);
    }
    validate(actual);
    for(const role of ['admin','psychologist','user']) assert(await bcrypt.compare(password,actual.users.find(u=>u.role===role).password));
    const report={target:'202.28.34.205:3306/db264',createdAt:new Date().toISOString(),counts:expected,backupDir,
      checks:['Exact row counts and supplied fields','Foreign keys enabled throughout','Assessment answer scores and prerequisites','8Q max score 52','Appointment schedule and session links','Passwords verified for all three roles','No AI chat or AI summary data','New user IDs do not overlap old accounts']};
    // Prepare report before commit so file system failures still roll back replacement.
    checkedWrite(path.join(demoDir,'validated-before-commit.json'),JSON.stringify(report,null,2));
    await c.commit();committed=true;transaction=false;
    checkedWrite(path.join(demoDir,'COMMITTED.json'),JSON.stringify(report,null,2));
    console.log('COMMITTED; accounts and SQL: '+demoDir);
  } catch(e) {
    if(transaction) await c.rollback();
    console.error(JSON.stringify({state:committed?'COMMITTED (post-commit report error)':'NOT COMMITTED; rolled back if started',error:e.message,backupDir}));
    process.exitCode=1;
  } finally {await c.end();}
}
main().catch(e=>{console.error(e.code||e.message);process.exitCode=1});
