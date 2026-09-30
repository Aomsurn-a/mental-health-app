const db = require('../config/db');

function inputError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

// ใช้วันที่ปฏิทินกรุงเทพฯ ไม่ขึ้นกับ timezone ของเครื่องที่รัน server
function bangkokDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
function shiftDate(date, days) {
  const value = new Date(date + 'T00:00:00Z');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function validateWeekStart(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw inputError('กรุณาระบุ weekStartDate เป็น YYYY-MM-DD');
  const date = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || value < '1000-01-01' || value > '9999-12-25') {
    throw inputError('วันที่เริ่มสัปดาห์ไม่ถูกต้อง');
  }
  if (date.getUTCDay() !== 1) throw inputError('สัปดาห์เริ่มวันจันทร์ กรุณาเลือกวันที่เป็นวันจันทร์');
  return value;
}
function nextTwoWeeks(today = bangkokDate()) {
  const day = new Date(today + 'T00:00:00Z').getUTCDay();
  const nextMonday = shiftDate(today, day === 0 ? 1 : 8 - day);
  return [nextMonday, shiftDate(nextMonday, 7)];
}

// ตรวจช่วงเวลาแบบเดียวกับฟอร์มรายสัปดาห์: เวลาจบต้องอยู่หลังเวลาเริ่มในวันเดียวกัน
function validateTemplate(body = {}) {
  const { day_of_week, max_patients_per_slot = 1 } = body;
  if (!Number.isInteger(day_of_week) || day_of_week < 0 || day_of_week > 6) throw inputError('วันต้องเป็นจำนวนเต็ม 0–6');
  if (!Number.isInteger(max_patients_per_slot) || max_patients_per_slot < 1 || max_patients_per_slot > 2147483647) throw inputError('จำนวนรับต้องเป็นจำนวนเต็มบวกไม่เกิน 2147483647');
  const normalize = value => {
    if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) throw inputError('กรุณาระบุเวลาในรูปแบบ HH:mm หรือ HH:mm:ss');
    return value.length === 5 ? value + ':00' : value;
  };
  const start_time = normalize(body.start_time), end_time = normalize(body.end_time);
  if (start_time >= end_time) throw inputError('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม');
  return { day_of_week, start_time, end_time, max_patients_per_slot };
}

// ใช้ lock ของนักจิตคนเดียวกันร่วมกับ CRUD เพื่อให้ template และการสร้างสัปดาห์เป็น snapshot เดียว
async function generateWeekFromTemplate(psychologistId, weekStartDate, { pool = db, dryRun = false } = {}) {
  validateWeekStart(weekStartDate);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [psychologists] = await conn.query('SELECT id, user_id FROM psychologists WHERE id = ? AND active_flag = ? FOR UPDATE', [psychologistId, 1]);
    if (!psychologists.length) throw inputError('ไม่พบข้อมูลนักจิตวิทยาที่ใช้งานอยู่', 403);
    // สำคัญ: ข้ามเฉพาะสัปดาห์ที่ยังใช้งานอยู่ ไม่ทับการแก้ไข; ถ้าลบแล้วสร้างแถวใหม่โดยเก็บประวัติเดิมไว้
    const [weeks] = await conn.query('SELECT id FROM psychologist_schedule_weeks WHERE psychologist_id = ? AND week_start = ? AND active_flag = ? FOR UPDATE', [psychologistId, weekStartDate, 1]);
    if (weeks.length) {
      await conn.commit();
      return { status: 'skipped', reason: 'week_exists', week_id: weeks[0].id, week_start: weekStartDate };
    }
    const [templates] = await conn.query('SELECT day_of_week, start_time, end_time, max_patients_per_slot FROM schedule_templates WHERE psychologist_id = ? AND active_flag = ? ORDER BY day_of_week, start_time, id FOR UPDATE', [psychologistId, 1]);
    if (!templates.length) {
      await conn.commit();
      return { status: 'skipped', reason: 'no_templates', week_start: weekStartDate };
    }
    const weekEnd = shiftDate(weekStartDate, 6);
    if (dryRun) {
      await conn.commit();
      return { status: 'would_create', week_start: weekStartDate, week_end: weekEnd, slotCount: templates.length };
    }
    const actorId = psychologists[0].user_id;
    const [week] = await conn.query('INSERT INTO psychologist_schedule_weeks (psychologist_id, week_start, week_end, created_by, updated_by) VALUES (?, ?, ?, ?, ?)', [psychologistId, weekStartDate, weekEnd, actorId, actorId]);
    for (const slot of templates) {
      // 0=อาทิตย์ แต่ week_start เป็นจันทร์ จึงต้องแปลง offset เป็น 6 สำหรับวันอาทิตย์
      const workDate = shiftDate(weekStartDate, (slot.day_of_week + 6) % 7);
      await conn.query(`INSERT INTO psychologist_schedules
        (psychologist_id, week_id, day_of_week, work_date, start_time, end_time, max_patients_per_slot, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [psychologistId, week.insertId, slot.day_of_week, workDate, slot.start_time, slot.end_time, slot.max_patients_per_slot, actorId, actorId]);
    }
    await conn.commit();
    return { status: 'created', week_id: week.insertId, week_start: weekStartDate, week_end: weekEnd, slotCount: templates.length };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}

module.exports = { generateWeekFromTemplate, validateTemplate, validateWeekStart, inputError, bangkokDate, shiftDate, nextTwoWeeks };
