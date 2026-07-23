const db = require('../config/db');

// หา psychologist_id จาก user ที่ login อยู่
const getPsychologistId = async (user_id) => {
  const [psy] = await db.query('SELECT id FROM psychologists WHERE user_id = ?', [user_id]);
  return psy.length > 0 ? psy[0].id : null;
};

// เพิ่มช่วงเวลาทำงาน (slots) ของแต่ละวันภายใต้สัปดาห์หนึ่ง ๆ ผ่าน connection เดียวกัน (ใช้ใน transaction)
const insertDaySlots = async (conn, psychologist_id, week_id, days, user_id) => {
  for (const day of days || []) {
    for (const slot of day.slots || []) {
      await conn.query(
        `INSERT INTO psychologist_schedules
         (psychologist_id, week_id, day_of_week, work_date, start_time, end_time, max_patients_per_slot, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [psychologist_id, week_id, day.day_of_week, day.work_date, slot.start_time, slot.end_time, slot.max_patients_per_slot || 1, user_id, user_id]
      );
    }
  }
};

const scheduleController = {

  // ดึงรายการตารางงานทั้งหมด (แบบสัปดาห์) ของนักจิตที่ login
  getWeeks: async (req, res) => {
    try {
      const psychologist_id = await getPsychologistId(req.user.id);
      if (!psychologist_id) {
        return res.status(404).json({ message: 'ไม่พบข้อมูลนักจิตวิทยา' });
      }

      const [rows] = await db.query(
        `SELECT w.id, w.week_start, w.week_end,
                GROUP_CONCAT(DISTINCT ps.work_date ORDER BY ps.work_date) as work_dates
         FROM psychologist_schedule_weeks w
         LEFT JOIN psychologist_schedules ps ON ps.week_id = w.id AND ps.active_flag = 1
         WHERE w.psychologist_id = ? AND w.active_flag = 1
         GROUP BY w.id
         ORDER BY w.week_start DESC`,
        [psychologist_id]
      );

      const weeks = rows.map(r => ({
        id: r.id,
        week_start: r.week_start,
        week_end: r.week_end,
        work_dates: r.work_dates ? r.work_dates.split(',') : [],
      }));

      res.json(weeks);
    } catch (error) {
      console.error('GetWeeks error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // สร้างตารางสัปดาห์ใหม่ พร้อม schedules ของแต่ละวัน
  createWeek: async (req, res) => {
    const conn = await db.getConnection();
    try {
      const psychologist_id = await getPsychologistId(req.user.id);
      if (!psychologist_id) {
        conn.release();
        return res.status(404).json({ message: 'ไม่พบข้อมูลนักจิตวิทยา' });
      }

      const { week_start, week_end, days } = req.body;
      if (!week_start || !week_end) {
        conn.release();
        return res.status(400).json({ message: 'กรุณาระบุช่วงสัปดาห์' });
      }

      const [duplicate] = await db.query(
        `SELECT id FROM psychologist_schedule_weeks
         WHERE psychologist_id = ? AND week_start = ? AND active_flag = 1`,
        [psychologist_id, week_start]
      );
      if (duplicate.length > 0) {
        conn.release();
        return res.status(400).json({ message: 'สัปดาห์นี้มีตารางอยู่แล้ว' });
      }

      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO psychologist_schedule_weeks (psychologist_id, week_start, week_end, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?)`,
        [psychologist_id, week_start, week_end, req.user.id, req.user.id]
      );

      await insertDaySlots(conn, psychologist_id, result.insertId, days, req.user.id);

      await conn.commit();
      res.status(201).json({ message: 'สร้างตารางสัปดาห์สำเร็จ', week_id: result.insertId });
    } catch (error) {
      await conn.rollback();
      console.error('CreateWeek error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    } finally {
      conn.release();
    }
  },

  // ดูรายละเอียดตารางของสัปดาห์หนึ่ง
  getWeekDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const psychologist_id = await getPsychologistId(req.user.id);
      if (!psychologist_id) {
        return res.status(404).json({ message: 'ไม่พบข้อมูลนักจิตวิทยา' });
      }

      const [weeks] = await db.query(
        `SELECT id, week_start, week_end FROM psychologist_schedule_weeks
         WHERE id = ? AND psychologist_id = ? AND active_flag = 1`,
        [id, psychologist_id]
      );
      if (weeks.length === 0) {
        return res.status(404).json({ message: 'ไม่พบตารางสัปดาห์นี้' });
      }

      const [schedules] = await db.query(
        `SELECT id, day_of_week, work_date, start_time, end_time, max_patients_per_slot
         FROM psychologist_schedules
         WHERE week_id = ? AND active_flag = 1
         ORDER BY work_date ASC, start_time ASC`,
        [id]
      );

      res.json({ ...weeks[0], schedules });
    } catch (error) {
      console.error('GetWeekDetail error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // แก้ไขตารางสัปดาห์ (แทนที่ schedules เดิมทั้งหมดด้วยชุดใหม่)
  updateWeek: async (req, res) => {
    const conn = await db.getConnection();
    try {
      const { id } = req.params;
      const psychologist_id = await getPsychologistId(req.user.id);
      if (!psychologist_id) {
        conn.release();
        return res.status(404).json({ message: 'ไม่พบข้อมูลนักจิตวิทยา' });
      }

      const [weeks] = await db.query(
        `SELECT id FROM psychologist_schedule_weeks WHERE id = ? AND psychologist_id = ? AND active_flag = 1`,
        [id, psychologist_id]
      );
      if (weeks.length === 0) {
        conn.release();
        return res.status(404).json({ message: 'ไม่พบตารางสัปดาห์นี้' });
      }

      const { week_start, week_end, days } = req.body;

      await conn.beginTransaction();

      await conn.query(
        `UPDATE psychologist_schedule_weeks SET week_start = ?, week_end = ?, updated_by = ? WHERE id = ?`,
        [week_start, week_end, req.user.id, id]
      );

      await conn.query(
        `UPDATE psychologist_schedules SET active_flag = 0, updated_by = ? WHERE week_id = ?`,
        [req.user.id, id]
      );

      await insertDaySlots(conn, psychologist_id, id, days, req.user.id);

      await conn.commit();
      res.json({ message: 'แก้ไขตารางสัปดาห์สำเร็จ' });
    } catch (error) {
      await conn.rollback();
      console.error('UpdateWeek error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    } finally {
      conn.release();
    }
  },

  // ลบตารางสัปดาห์ (soft delete ทั้งสัปดาห์และ schedules ในสัปดาห์นั้น)
  deleteWeek: async (req, res) => {
    const conn = await db.getConnection();
    try {
      const { id } = req.params;
      const psychologist_id = await getPsychologistId(req.user.id);
      if (!psychologist_id) {
        conn.release();
        return res.status(404).json({ message: 'ไม่พบข้อมูลนักจิตวิทยา' });
      }

      const [weeks] = await db.query(
        `SELECT id FROM psychologist_schedule_weeks WHERE id = ? AND psychologist_id = ? AND active_flag = 1`,
        [id, psychologist_id]
      );
      if (weeks.length === 0) {
        conn.release();
        return res.status(404).json({ message: 'ไม่พบตารางสัปดาห์นี้' });
      }

      await conn.beginTransaction();

      await conn.query(
        `UPDATE psychologist_schedule_weeks SET active_flag = 0, updated_by = ? WHERE id = ?`,
        [req.user.id, id]
      );
      await conn.query(
        `UPDATE psychologist_schedules SET active_flag = 0, updated_by = ? WHERE week_id = ?`,
        [req.user.id, id]
      );

      await conn.commit();
      res.json({ message: 'ลบตารางสัปดาห์สำเร็จ' });
    } catch (error) {
      await conn.rollback();
      console.error('DeleteWeek error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    } finally {
      conn.release();
    }
  },

  // ดึงช่วงเวลาที่ยังว่างของนักจิต สำหรับให้ user เลือกตอนนัดหมาย
  getAvailableSlots: async (req, res) => {
    try {
      const { psy_id } = req.params;

      const [rows] = await db.query(
        `SELECT ps.id, ps.work_date, ps.day_of_week, ps.start_time, ps.end_time, ps.max_patients_per_slot,
                (ps.max_patients_per_slot * TIMESTAMPDIFF(HOUR, ps.start_time, ps.end_time)) as total_slots,
                (SELECT COUNT(*) FROM appointments a
                  WHERE a.psychologist_id = ps.psychologist_id
                    AND a.appointment_date = ps.work_date
                    AND a.appointment_time >= ps.start_time AND a.appointment_time < ps.end_time
                    AND a.active_flag = 1 AND a.status NOT IN ('rejected', 'cancelled')
                ) as booked_count
         FROM psychologist_schedules ps
         JOIN psychologist_schedule_weeks w ON ps.week_id = w.id
         WHERE ps.psychologist_id = ? AND ps.active_flag = 1 AND w.active_flag = 1
           AND ps.work_date >= CURDATE()
         ORDER BY ps.work_date ASC, ps.start_time ASC`,
        [psy_id]
      );

      const available = rows
        .map(r => ({ ...r, remaining: r.total_slots - r.booked_count }))
        .filter(r => r.remaining > 0);

      res.json(available);
    } catch (error) {
      console.error('GetAvailableSlots error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },
};

module.exports = scheduleController;
