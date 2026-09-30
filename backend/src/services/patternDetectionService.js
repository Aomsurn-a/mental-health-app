const calc = require('./trendCalculationService');

// คำนวณ pattern ล้วน ไม่มี AI: ช่วงคะแนนต่ำต้องต่อเนื่องถึงวันนี้/เมื่อวาน และไม่มีวันขาดคั่น
function detectPatterns(rows, today = calc.bangkokDate()) {
  const daily = calc.dailyMoods(rows).filter(r => r.mood_date <= today);
  if (!daily.length) return [];
  const last = daily.at(-1), patterns = [];
  let streak = 0, episode = last.mood_date;
  for (let i = daily.length - 1; i >= 0; i--) {
    const row = daily[i];
    if (Number(row.mood_score) > 2 || row.mood_date !== calc.shiftDate(last.mood_date, -streak)) break;
    streak++; episode = row.mood_date;
  }
  if (streak >= 3 && calc.daysBetween(last.mood_date, today) <= 1) patterns.push({
    alert_type: 'mood_drop', episode_date: episode,
    raw_numbers: { consecutive_days: streak, threshold: 2, last_record_date: last.mood_date },
  });
  const gap = calc.daysBetween(last.mood_date, today);
  const regularDays = daily.filter(r => r.mood_date >= calc.shiftDate(last.mood_date, -6)).length;
  if (gap > 5 && regularDays >= 4) patterns.push({
    alert_type: 'no_record_gap', episode_date: last.mood_date,
    raw_numbers: { days_since_last_record: gap, previous_recorded_days: regularDays,
      baseline_days: 7, minimum_regular_days: 4, gap_threshold: 5, last_record_date: last.mood_date },
  });
  return patterns;
}

// ดึงผู้ป่วยที่เคยบันทึกทั้งหมด เพื่อไม่ให้พลาดผู้ที่ขาดบันทึกเกินเจ็ดวัน ไม่เรียก AI
async function candidates(db) {
  const [rows] = await db.query(`SELECT DISTINCT m.user_id FROM mood_tracking m
    JOIN users u ON u.id = m.user_id WHERE m.active_flag = ? AND u.active_flag = ? AND u.status = ?`, [1, 1, 'active']);
  return rows;
}

// หาเจ้าของเคสจากนัดล่าสุด ใช้ psychologists.id ไม่ใช่ users.id และรับเฉพาะบัญชีที่ยังใช้งาน
async function recipient(db, patientId) {
  const [rows] = await db.query(`SELECT p.id FROM appointments a
    JOIN psychologists p ON p.id = a.psychologist_id JOIN users u ON u.id = p.user_id
    WHERE a.user_id = ? AND a.active_flag = ? AND a.status IN (?, ?)
      AND p.active_flag = ? AND u.active_flag = ? AND u.status = ?
    ORDER BY a.appointment_date DESC, a.appointment_time DESC, a.id DESC LIMIT 1`,
  [patientId, 1, 'completed', 'approved', 1, 1, 'active']);
  return rows[0]?.id;
}

// ข้อความสำรองจากกฎและตัวเลขที่คำนวณแล้ว เมื่อ AI ใช้งานไม่ได้ยังเก็บ alert ได้
function fallbackMessage(pattern) {
  return pattern.alert_type === 'mood_drop'
    ? `คะแนนอารมณ์ไม่เกิน ${pattern.raw_numbers.threshold} ติดต่อกัน ${pattern.raw_numbers.consecutive_days} วัน กรุณาทบทวนข้อมูลและพิจารณาติดต่อผู้รับบริการ`
    : `ไม่มีบันทึกอารมณ์มา ${pattern.raw_numbers.days_since_last_record} วัน กรุณาติดต่อสอบถามความเป็นอยู่และอุปสรรคในการบันทึก`;
}
module.exports = { detectPatterns, candidates, recipient, fallbackMessage };
