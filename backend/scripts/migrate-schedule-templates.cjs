const fs = require('node:fs'), path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const db = require('../src/config/db');
db.query(fs.readFileSync(path.join(__dirname, '../../Data/migration_schedule_templates.sql'), 'utf8'))
  .then(() => console.log('schedule_templates migration completed'))
  .catch(error => { console.error(error.code || error.message); process.exitCode = 1; })
  .finally(() => db.end());
