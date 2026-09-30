const db = require('../config/db');
const { generateWeekFromTemplate, validateTemplate, validateWeekStart, shiftDate, inputError } = require('../services/scheduleGenerationService');

// หาเจ้าของจาก JWT เท่านั้น ไม่รับ psychologist_id จาก client
async function owner(conn, userId, lock = false) {
  const [rows] = await conn.query('SELECT id FROM psychologists WHERE user_id = ? AND active_flag = ?' + (lock ? ' FOR UPDATE' : ''), [userId, 1]);
  if (!rows.length) throw inputError('ไม่พบข้อมูลนักจิตวิทยาที่ใช้งานอยู่', 403);
  return rows[0].id;
}
function templateId(value) {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw inputError('รหัสตารางงานประจำไม่ถูกต้อง');
  return Number(value);
}
function fail(res, error) {
  if (!error.status) console.error('Schedule template:', { code: error.code || error.name });
  return res.status(error.status || 500).json({ message: error.status ? error.message : 'ดำเนินการตารางงานประจำไม่สำเร็จ กรุณาลองอีกครั้ง' });
}

// อ่านเฉพาะรายการที่ยังใช้งานของนักจิตที่ล็อกอินอยู่
exports.list = async (req, res) => {
  try {
    const id = await owner(db, req.user.id);
    const [rows] = await db.query(`SELECT id, day_of_week, start_time, end_time, max_patients_per_slot
      FROM schedule_templates WHERE psychologist_id = ? AND active_flag = ?
      ORDER BY MOD(day_of_week + 6, 7), start_time, id`, [id, 1]);
    res.json(rows);
  } catch (error) { fail(res, error); }
};

// ล็อกแถวเจ้าของก่อนแก้ เพื่อป้องกันช่วงเวลาทับซ้อนจากคำขอพร้อมกัน และไม่แตะตารางรายสัปดาห์เดิม
async function mutate(req, res, operation) {
  let conn;
  try {
    const id = operation === 'create' ? null : templateId(req.params.id);
    const value = operation === 'delete' ? null : validateTemplate(req.body || {});
    conn = await db.getConnection();
    await conn.beginTransaction();
    const psychologistId = await owner(conn, req.user.id, true);
    if (id !== null) {
      const [rows] = await conn.query('SELECT id FROM schedule_templates WHERE id = ? AND psychologist_id = ? AND active_flag = ? FOR UPDATE', [id, psychologistId, 1]);
      if (!rows.length) throw inputError('ไม่พบตารางงานประจำนี้', 404);
    }
    if (operation === 'delete') {
      await conn.query('UPDATE schedule_templates SET active_flag = ? WHERE id = ? AND psychologist_id = ?', [0, id, psychologistId]);
      await conn.commit();
      return res.json({ message: 'ลบตารางงานประจำแล้ว ตารางที่สร้างไว้ยังคงเดิม' });
    }
    const [overlap] = await conn.query(`SELECT id FROM schedule_templates WHERE psychologist_id = ? AND active_flag = ?
      AND day_of_week = ? AND start_time < ? AND end_time > ? AND id <> ? FOR UPDATE`,
    [psychologistId, 1, value.day_of_week, value.end_time, value.start_time, id || 0]);
    if (overlap.length) throw inputError('ช่วงเวลาซ้อนกับตารางงานประจำของวันเดียวกัน กรุณาเลือกเวลาอื่น', 409);
    let savedId = id;
    const values = [value.day_of_week, value.start_time, value.end_time, value.max_patients_per_slot];
    if (operation === 'create') {
      const [saved] = await conn.query('INSERT INTO schedule_templates (psychologist_id, day_of_week, start_time, end_time, max_patients_per_slot) VALUES (?, ?, ?, ?, ?)', [psychologistId, ...values]);
      savedId = saved.insertId;
    } else {
      await conn.query('UPDATE schedule_templates SET day_of_week = ?, start_time = ?, end_time = ?, max_patients_per_slot = ? WHERE id = ? AND psychologist_id = ?', [...values, id, psychologistId]);
    }
    await conn.commit();
    res.status(operation === 'create' ? 201 : 200).json({ id: savedId, ...value });
  } catch (error) {
    if (conn) await conn.rollback();
    fail(res, error);
  } finally { if (conn) conn.release(); }
}
exports.create = (req, res) => mutate(req, res, 'create');
exports.update = (req, res) => mutate(req, res, 'update');
exports.remove = (req, res) => mutate(req, res, 'delete');

// การแก้ไขตามปุ่มเท่านั้น ตรวจเจ้าของจาก JWT และคำนวณสองสัปดาห์ปัจจุบันฝั่ง server
exports.applyCurrentWeeks = async (req, res) => {
  try {
    const id = await owner(db, req.user.id);
    const result = await require('../services/scheduleReconciliationService').applyCurrentTwoWeeks(id);
    res.json(result);
  } catch (error) { fail(res, error); }
};

// ปุ่มสร้างทันทีใช้บริการเดียวกับ cron เพื่อให้กฎข้ามสัปดาห์เหมือนกันทุกทาง
exports.generateNow = async (req, res) => {
  try {
    const id = await owner(db, req.user.id);
    const count = req.body?.weekCount ?? 1;
    if (count !== 1 && count !== 2) throw inputError('จำนวนสัปดาห์ต้องเป็น 1 หรือ 2');
    const start = validateWeekStart(req.body?.weekStartDate);
    if (count === 2) {
      const second = validateWeekStart(shiftDate(start, 7));
      // แต่ละสัปดาห์มี transaction ของตัวเอง กดซ้ำจะข้ามส่วนที่สำเร็จแล้วและเติมเฉพาะส่วนที่ยังไม่มี
      const results = [];
      for (const date of [start, second]) results.push(await generateWeekFromTemplate(id, date));
      const created = results.filter(result => result.status === 'created').length;
      return res.status(created ? 201 : 200).json({ results, created, skipped: results.length - created });
    }
    const result = await generateWeekFromTemplate(id, start);
    res.status(result.status === 'created' ? 201 : 200).json(result);
  } catch (error) { fail(res, error); }
};
