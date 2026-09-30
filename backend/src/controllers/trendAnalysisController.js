const db = require('../config/db');
const calc = require('../services/trendCalculationService');
const ai = require('../services/aiInterpretationService');

// ตรวจสิทธิ์ระดับเคสก่อนอ่านข้อมูล/ส่ง AI ทุกครั้ง ใช้ user id จาก JWT หา psychologist id จริง
async function authorize(req, res, patient = false) {
  const [rows] = await db.query(`SELECT p.id FROM psychologists p JOIN users u ON u.id = p.user_id
    WHERE p.user_id = ? AND p.active_flag = ? AND u.active_flag = ? AND u.status = ? AND u.role = ?`,
  [req.user.id, 1, 1, 'active', 'psychologist']);
  if (!rows.length) { res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' }); return null; }
  if (patient) {
    if (!/^[1-9]\d*$/.test(req.params.patientId)) { res.status(400).json({ message: 'รหัสผู้รับบริการไม่ถูกต้อง' }); return null; }
    const [care] = await db.query(`SELECT a.id FROM appointments a JOIN users u ON u.id = a.user_id
      WHERE a.user_id = ? AND a.psychologist_id = ? AND a.active_flag = ?
        AND a.status IN (?, ?) AND u.active_flag = ? LIMIT 1`,
    [req.params.patientId, rows[0].id, 1, 'approved', 'completed', 1]);
    if (!care.length) { res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึงผู้รับบริการรายนี้' }); return null; }
  }
  return rows[0].id;
}

// อ่านคะแนนและคำนวณก่อน จากนั้นจึงเรียก AI; ไม่ส่งคำตอบดิบหรือข้อมูลบัญชีให้ AI
async function assessmentTrend(req, res) {
  try {
    if (!await authorize(req, res, true)) return;
    const [rows] = await db.query(`SELECT ar.id,ar.set_id,ar.score,ar.taken_at,s.name AS set_name
      FROM assessment_results ar JOIN assessment_sets s ON s.id = ar.set_id
      WHERE ar.user_id = ? AND ar.active_flag = ? ORDER BY ar.taken_at, ar.id`, [req.params.patientId, 1]);
    const raw_numbers = calc.assessmentTrend(rows);
    const ai_summary = raw_numbers.sets.length ? await ai.interpret('assessment', raw_numbers) : undefined;
    res.json({ raw_numbers, ...(ai_summary ? { ai_summary } : {}) });
  } catch (error) { fail(res, error); }
}

// คำนวณค่าเฉลี่ยสองช่วงก่อนเรียก AI; เฉพาะ endpoint นี้อนุญาตส่ง note ตามข้อกำหนด
async function moodTrend(req, res) {
  try {
    if (!await authorize(req, res, true)) return;
    const value = req.query.days === undefined ? '14' : req.query.days;
    if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 90) {
      return res.status(400).json({ message: 'days ต้องเป็นจำนวนเต็ม 1–90' });
    }
    const days = Number(value), today = calc.bangkokDate();
    const [rows] = await db.query(`SELECT id,DATE_FORMAT(mood_date,'%Y-%m-%d') AS mood_date,mood_score,note
      FROM mood_tracking WHERE user_id = ? AND active_flag = ? AND mood_date BETWEEN ? AND ? ORDER BY mood_date,id`,
    [req.params.patientId, 1, calc.shiftDate(today, 1 - 2 * days), today]);
    const { raw_numbers, notes } = calc.moodTrend(rows, days, today);
    const ai_summary = raw_numbers.current_count ? await ai.interpret('mood', raw_numbers, notes) : undefined;
    res.json({ raw_numbers, ...(ai_summary ? { ai_summary } : {}) });
  } catch (error) { fail(res, error); }
}

// อ่านแจ้งเตือนเฉพาะนักจิตเจ้าของ ไม่เรียก AI และไม่ใช้ id จาก client เป็นเจ้าของ
async function alerts(req, res) {
  try {
    const psychologistId = await authorize(req, res);
    if (!psychologistId) return;
    const acknowledged = req.query.acknowledged ?? 'false';
    if (!['true', 'false'].includes(acknowledged)) return res.status(400).json({ message: 'acknowledged ต้องเป็น true หรือ false' });
    const [rows] = await db.query(`SELECT id,patient_id,alert_type,message,triggered_at,acknowledged,raw_numbers,message_source
      FROM mood_pattern_alerts WHERE psychologist_id = ? AND active_flag = ? AND acknowledged = ?
      ORDER BY triggered_at DESC,id DESC`, [psychologistId, 1, acknowledged === 'true' ? 1 : 0]);
    res.json(rows);
  } catch (error) { fail(res, error); }
}

// รับทราบเฉพาะ alert ของเจ้าของ กดซ้ำได้โดยไม่สร้างหรือแก้ไข alert ของผู้อื่น
async function acknowledge(req, res) {
  try {
    const psychologistId = await authorize(req, res);
    if (!psychologistId) return;
    if (!/^[1-9]\d*$/.test(req.params.id)) return res.status(400).json({ message: 'รหัสแจ้งเตือนไม่ถูกต้อง' });
    const [result] = await db.query(`UPDATE mood_pattern_alerts SET acknowledged = ?
      WHERE id = ? AND psychologist_id = ? AND active_flag = ?`, [1, req.params.id, psychologistId, 1]);
    if (!result.affectedRows) return res.status(404).json({ message: 'ไม่พบแจ้งเตือน' });
    res.json({ message: 'รับทราบแจ้งเตือนแล้ว' });
  } catch (error) { fail(res, error); }
}

// ส่งข้อผิดพลาดฐานข้อมูลแบบไม่เปิดเผยข้อมูลสุขภาพ/SQL
function fail(res, error) {
  console.error('Trend analysis:', { code: error.code || error.name });
  res.status(500).json({ message: 'โหลดข้อมูลวิเคราะห์ไม่สำเร็จ' });
}
module.exports = { assessmentTrend, moodTrend, alerts, acknowledge };
