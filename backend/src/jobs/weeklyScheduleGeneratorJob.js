const cron = require('node-cron');
const { generateWeekFromTemplate, nextTwoWeeks, bangkokDate } = require('../services/scheduleGenerationService');

// ทุกวันอาทิตย์สร้างจันทร์ถัดไปและจันทร์อีกหนึ่งสัปดาห์ ไม่แก้สัปดาห์ที่สร้างไว้แล้ว
async function runWeeklyScheduleGenerator({ db = require('../config/db'), today = bangkokDate(), dryRun = false } = {}) {
  const weekStarts = nextTwoWeeks(today);
  const stats = { weekStarts, dryRun, psychologists: 0, created: 0, skipped: 0, would_create: 0, failed: 0 };
  const [rows] = await db.query(`SELECT DISTINCT p.id FROM psychologists p
    JOIN schedule_templates t ON t.psychologist_id = p.id
    WHERE p.active_flag = ? AND t.active_flag = ? ORDER BY p.id`, [1, 1]);
  stats.psychologists = rows.length;
  for (const psychologist of rows) {
    for (const week of weekStarts) {
      try {
        const result = await generateWeekFromTemplate(psychologist.id, week, { pool: db, dryRun });
        stats[result.status]++;
      } catch (error) {
        stats.failed++;
        console.error('Weekly schedule generation:', { code: error.code || error.name });
      }
    }
  }
  return stats;
}
function startWeeklyScheduleGeneratorJob() {
  return cron.schedule('0 0 * * 0', async () => {
    try { console.log('Weekly schedules:', await runWeeklyScheduleGenerator()); }
    catch (error) { console.error('Weekly schedule job:', { code: error.code || error.name }); }
  }, { timezone: 'Asia/Bangkok', noOverlap: true });
}

// รัน manual ด้วย --dry-run เพื่อตรวจล่วงหน้าโดยไม่สร้างข้อมูลจริง
if (require.main === module) {
  const db = require('../config/db');
  runWeeklyScheduleGenerator({ db, dryRun: process.argv.includes('--dry-run') })
    .then(stats => { console.log(JSON.stringify(stats)); if (stats.failed) process.exitCode = 1; })
    .catch(error => { console.error(error.code || error.message); process.exitCode = 1; })
    .finally(() => db.end());
}
module.exports = { runWeeklyScheduleGenerator, startWeeklyScheduleGeneratorJob };
