const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const db = require('../src/config/db');

async function migrate() {
  // ตรวจคอลัมน์ก่อนเพื่อให้สั่ง migration ซ้ำได้โดยไม่เพิ่มคอลัมน์เดิม
  const [psychColumns] = await db.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'psychologists' AND COLUMN_NAME = 'gender'`
  );
  if (!psychColumns.length) {
    await db.query("ALTER TABLE psychologists ADD COLUMN gender ENUM('male', 'female') NULL AFTER user_id");
  }

  for (const column of ['consultation_topic', 'patient_note']) {
    const [columns] = await db.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = ?`,
      [column]
    );
    if (!columns.length) await db.query(`ALTER TABLE appointments ADD COLUMN ${column} TEXT NULL`);
  }
  console.log('Appointment gender and patient topic/note migration completed');
}

migrate()
  .catch(error => { console.error(error.code || error.message); process.exitCode = 1; })
  .finally(() => db.end());
