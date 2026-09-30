const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const db = require('../src/config/db');
// เพิ่มตารางเท่านั้น ไม่ลบหรือแก้ข้อมูลเดิม ไม่เรียก AI
db.query(fs.readFileSync(path.join(__dirname, '../../Data/migration_trend_analysis.sql'), 'utf8'))
  .then(() => console.log('mood_pattern_alerts migration completed'))
  .catch(error => { console.error(error.code || error.message); process.exitCode = 1; })
  .finally(() => db.end());
