const cron = require('node-cron');
const calc = require('../services/trendCalculationService');
const patterns = require('../services/patternDetectionService');
const ai = require('../services/aiInterpretationService');

// งานประสาน: คำนวณด้วยกฎก่อน แล้วจึงเรียก AI เขียนข้อความ แยกจากบริการตรวจจับอย่างชัดเจน
async function runPatternDetection({ db = require('../config/db'), today = calc.bangkokDate(), interpret = ai.interpret, dryRun = false } = {}) {
  const stats = { scanned: 0, detected: 0, created: 0, duplicate: 0, unassigned: 0, failed: 0, fallback: 0 };
  const lock = await db.getConnection();
  const lockName = 'mood_patterns:' + (process.env.DB_NAME || 'default');
  let acquired = false;
  try {
    const [result] = await lock.query('SELECT GET_LOCK(?, ?) AS acquired', [lockName.slice(0, 64), 0]);
    acquired = result[0].acquired === 1;
    if (!acquired) return { ...stats, skipped: 'already_running' };
    for (const { user_id } of await patterns.candidates(db)) {
      stats.scanned++;
      try {
        const [rows] = await db.query(`SELECT id,DATE_FORMAT(mood_date,'%Y-%m-%d') AS mood_date,mood_score
          FROM mood_tracking WHERE user_id = ? AND active_flag = ? AND mood_date <= ? ORDER BY mood_date,id`, [user_id, 1, today]);
        const detected = patterns.detectPatterns(rows, today);
        stats.detected += detected.length;
        if (!detected.length) continue;
        const psychologistId = await patterns.recipient(db, user_id);
        if (!psychologistId) { stats.unassigned++; continue; }
        for (const pattern of detected) {
          const [existing] = await db.query(`SELECT id FROM mood_pattern_alerts
            WHERE patient_id = ? AND psychologist_id = ? AND alert_type = ? AND episode_date = ?`,
          [user_id, psychologistId, pattern.alert_type, pattern.episode_date]);
          if (existing.length) { stats.duplicate++; continue; }
          if (dryRun) continue;
          let summary;
          try { summary = await interpret('pattern', { alert_type: pattern.alert_type, ...pattern.raw_numbers }); }
          catch (error) { console.error('Pattern interpretation:', { code: error.code || error.name }); }
          if (!summary) stats.fallback++;
          const [saved] = await db.query(`INSERT INTO mood_pattern_alerts
            (patient_id,psychologist_id,alert_type,message,episode_date,raw_numbers,message_source)
            VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id`,
          [user_id, psychologistId, pattern.alert_type, summary || patterns.fallbackMessage(pattern),
            pattern.episode_date, JSON.stringify(pattern.raw_numbers), summary ? 'ai' : 'rule']);
          if (saved.affectedRows === 1) stats.created++;
        }
      } catch (error) { stats.failed++; console.error('Pattern detection:', { code: error.code || error.name }); }
    }
    return stats;
  } finally {
    try { if (acquired) await lock.query('SELECT RELEASE_LOCK(?)', [lockName.slice(0, 64)]); }
    finally { lock.release(); }
  }
}

// ตั้งเวลา 06:00 Asia/Bangkok ไม่รันทันทีตอน import และป้องกันงานซ้อนด้วย cron/DB lock
function startPatternDetectionJob() {
  return cron.schedule('0 6 * * *', async () => {
    try { console.log('Pattern detection completed:', await runPatternDetection()); }
    catch (error) { console.error('Pattern job:', { code: error.code || error.name }); }
  }, { timezone: 'Asia/Bangkok', noOverlap: true });
}

// CLI เรียกด้วย --dry-run เพื่อทดสอบกฎโดยไม่เรียก AI หรือสร้างแจ้งเตือน
if (require.main === module) {
  require('dotenv').config({ path: require('node:path').join(__dirname, '../../.env'), quiet: true });
  const db = require('../config/db');
  runPatternDetection({ db, dryRun: process.argv.includes('--dry-run') })
    .then(stats => { console.log(JSON.stringify(stats)); if (stats.failed) process.exitCode = 1; })
    .catch(error => { console.error(error.code || error.message); process.exitCode = 1; })
    .finally(() => db.end());
}
module.exports = { runPatternDetection, startPatternDetectionJob };
