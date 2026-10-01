const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const db = require('../src/config/db');

const columns = [
  {
    table: 'appointments',
    name: 'consultation_topic',
    definition: 'TEXT NULL',
  },
  {
    table: 'appointments',
    name: 'patient_note',
    definition: 'TEXT NULL',
  },
  {
    table: 'psychologists',
    name: 'gender',
    definition: "ENUM('male', 'female') NULL",
  },
];

async function run() {
  for (const column of columns) {
    const [rows] = await db.query(
      `SELECT 1 FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [column.table, column.name],
    );
    if (rows.length) {
      console.log(`${column.table}.${column.name} already exists; skipped`);
      continue;
    }
    await db.query(`ALTER TABLE \`${column.table}\` ADD COLUMN \`${column.name}\` ${column.definition}`);
    console.log(`Added ${column.table}.${column.name}`);
  }
}

run()
  .catch((error) => {
    console.error(error.code || error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
