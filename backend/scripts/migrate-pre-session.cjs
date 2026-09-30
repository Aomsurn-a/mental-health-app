const fs=require('node:fs'),path=require('node:path');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const db=require('../src/config/db');
// เพิ่มตาราง cache เท่านั้น ไม่ลบข้อมูลเดิมหรือเรียก AI
db.query(fs.readFileSync(path.join(__dirname,'../../Data/migration_pre_session.sql'),'utf8'))
  .then(()=>console.log('patient_session_summaries migration completed'))
  .catch(error=>{console.error(error.code||error.message);process.exitCode=1;})
  .finally(()=>db.end());
