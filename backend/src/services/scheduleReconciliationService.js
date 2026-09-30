const db = require('../config/db');
const { bangkokDate, shiftDate, inputError } = require('./scheduleGenerationService');

function currentTwoWeeks(today = bangkokDate()) {
  const start = shiftDate(today, -((new Date(today + 'T00:00:00Z').getUTCDay() + 6) % 7));
  return [start, shiftDate(start, 7)];
}

// เก็บช่วงเดิมทั้งช่วงเมื่อมีนัด ไม่ลดจำนวนรับ และตัดส่วนที่ทับออกจากช่วงใหม่เพื่อไม่เปิดรับซ้ำ
function subtractProtected(slot, protectedSlots) {
  let pieces = [{ ...slot }];
  for (const kept of protectedSlots) {
    if (kept.work_date !== slot.work_date) continue;
    pieces = pieces.flatMap(piece => {
      if (piece.end_time <= kept.start_time || piece.start_time >= kept.end_time) return [piece];
      const remaining = [];
      if (piece.start_time < kept.start_time) remaining.push({ ...piece, end_time: kept.start_time });
      if (piece.end_time > kept.end_time) remaining.push({ ...piece, start_time: kept.end_time });
      return remaining;
    });
  }
  return pieces;
}

// เฉพาะปุ่มแก้ไข: ใช้ transaction เดียวทั้งสองสัปดาห์ ไม่เปลี่ยนพฤติกรรม cron/generate-now
async function applyCurrentTwoWeeks(psychologistId, { pool = db, today = bangkokDate() } = {}) {
  const starts = currentTwoWeeks(today), end = shiftDate(starts[1], 6);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [owners] = await conn.query('SELECT id, user_id FROM psychologists WHERE id = ? AND active_flag = ? FOR UPDATE', [psychologistId, 1]);
    if (!owners.length) throw inputError('ไม่พบข้อมูลนักจิตวิทยาที่ใช้งานอยู่', 403);
    const [templates] = await conn.query('SELECT day_of_week, start_time, end_time, max_patients_per_slot FROM schedule_templates WHERE psychologist_id = ? AND active_flag = ? ORDER BY day_of_week, start_time, id FOR UPDATE', [psychologistId, 1]);
    if (!templates.length) {
      await conn.commit();
      return { status: 'skipped', reason: 'no_templates', created: 0, updated: 0, protectedSlots: [], weekStarts: starts };
    }
    // ล็อกนัดในช่วงวันที่ด้วย locking read เพื่อใช้นัดล่าสุด ไม่ใช้ snapshot เก่าระหว่างแก้ตาราง
    const [appointments] = await conn.query(`SELECT DATE_FORMAT(appointment_date, '%Y-%m-%d') AS work_date, appointment_time
      FROM appointments WHERE psychologist_id = ? AND appointment_date BETWEEN ? AND ?
      AND active_flag = ? AND status NOT IN (?, ?) FOR UPDATE`, [psychologistId, starts[0], end, 1, 'rejected', 'cancelled']);
    const result = { status: 'applied', created: 0, updated: 0, protectedSlots: [], weekStarts: starts };
    for (const start of starts) {
      const weekEnd = shiftDate(start, 6), actor = owners[0].user_id;
      const [weeks] = await conn.query('SELECT id FROM psychologist_schedule_weeks WHERE psychologist_id = ? AND week_start = ? AND active_flag = ? FOR UPDATE', [psychologistId, start, 1]);
      if (weeks.length > 1) throw inputError('พบตารางสัปดาห์ซ้ำ กรุณาตรวจสอบตารางรายสัปดาห์ก่อนแก้ไข ระบบยังไม่เปลี่ยนข้อมูล', 409);
      let slots = [];
      if (weeks.length) {
        [slots] = await conn.query(`SELECT id, DATE_FORMAT(work_date, '%Y-%m-%d') AS work_date, start_time, end_time,
          day_of_week, max_patients_per_slot FROM psychologist_schedules
          WHERE week_id = ? AND psychologist_id = ? AND active_flag = ? FOR UPDATE`, [weeks[0].id, psychologistId, 1]);
      }
      const bookings = appointments.filter(a => a.work_date >= start && a.work_date <= weekEnd);
      const contains = (slot, appointment) => slot.work_date === appointment.work_date && appointment.appointment_time >= slot.start_time && appointment.appointment_time < slot.end_time;
      // นัดที่ไม่มีช่วงตารางรองรับ (เช่นลบสัปดาห์ไปแล้ว) ห้ามเดาระยะเวลานัดหรือสร้างทับ ต้องให้ตรวจสอบก่อน
      if (bookings.some(a => !slots.some(s => contains(s, a)))) {
        throw inputError(`พบการนัดหมายที่ไม่มีช่วงตารางรองรับในสัปดาห์ ${start} กรุณาตรวจสอบนัดหมายและตารางงานก่อน ระบบยังไม่เปลี่ยนทั้ง 2 สัปดาห์`, 409);
      }
      const protectedSlots = slots.filter(s => bookings.some(a => contains(s, a)));
      result.protectedSlots.push(...protectedSlots.map(s => ({ work_date: s.work_date, start_time: s.start_time, end_time: s.end_time,
        appointmentCount: bookings.filter(a => contains(s, a)).length })));
      let weekId = weeks[0]?.id;
      if (!weekId) {
        const [inserted] = await conn.query('INSERT INTO psychologist_schedule_weeks (psychologist_id, week_start, week_end, created_by, updated_by) VALUES (?, ?, ?, ?, ?)', [psychologistId, start, weekEnd, actor, actor]);
        weekId = inserted.insertId;
        result.created++;
      } else {
        result.updated++;
        const keptIds = new Set(protectedSlots.map(s => s.id));
        for (const slot of slots) {
          if (!keptIds.has(slot.id)) await conn.query('UPDATE psychologist_schedules SET active_flag = ?, updated_by = ? WHERE id = ? AND psychologist_id = ?', [0, actor, slot.id, psychologistId]);
        }
        await conn.query('UPDATE psychologist_schedule_weeks SET updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ? AND psychologist_id = ?', [actor, weekId, psychologistId]);
      }
      for (const template of templates) {
        const slot = { ...template, work_date: shiftDate(start, (template.day_of_week + 6) % 7) };
        for (const piece of subtractProtected(slot, protectedSlots)) {
          await conn.query(`INSERT INTO psychologist_schedules
            (psychologist_id, week_id, day_of_week, work_date, start_time, end_time, max_patients_per_slot, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [psychologistId, weekId, piece.day_of_week, piece.work_date, piece.start_time, piece.end_time, piece.max_patients_per_slot, actor, actor]);
        }
      }
    }
    await conn.commit();
    return result;
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}

module.exports = { applyCurrentTwoWeeks, currentTwoWeeks, subtractProtected };
