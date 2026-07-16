const db = require('../config/db');

const appointmentController = {

  // ดึงรายการนักจิตวิทยาทั้งหมด
  getPsychologists: async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT p.id, p.license_number, p.specialty, p.hospital_clinic, 
                p.phone, p.experience_years, p.bio,
                u.first_name, u.last_name, u.email
         FROM psychologists p
         JOIN users u ON p.user_id = u.id
         WHERE p.active_flag = 1 AND u.status = 'active'`
      );
      res.json(rows);
    } catch (error) {
      console.error('GetPsychologists error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ส่งคำขอนัดหมาย
  createAppointment: async (req, res) => {
    try {
      const { psychologist_id, appointment_date, appointment_time, location, note: status_note } = req.body;
      const user_id = req.user.id;

      // เช็คว่านักจิตว่างในช่วงเวลานั้นไหม
      const [existing] = await db.query(
        `SELECT id FROM appointments 
         WHERE psychologist_id = ? AND appointment_date = ? AND appointment_time = ?
         AND status NOT IN ('rejected', 'cancelled') AND active_flag = 1`,
        [psychologist_id, appointment_date, appointment_time]
      );

      if (existing.length > 0) {
        return res.status(400).json({ message: 'นักจิตวิทยาไม่ว่างในช่วงเวลานี้' });
      }

      const [result] = await db.query(
        `INSERT INTO appointments 
         (user_id, psychologist_id, appointment_date, appointment_time, location, status_note, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [user_id, psychologist_id, appointment_date, appointment_time, location, status_note, user_id, user_id]
      );

      res.status(201).json({
        message: 'ส่งคำขอนัดหมายสำเร็จ',
        appointment_id: result.insertId
      });
    } catch (error) {
      console.error('CreateAppointment error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงการนัดหมายของ user
  getMyAppointments: async (req, res) => {
    try {
      const user_id = req.user.id;
      const [rows] = await db.query(
        `SELECT a.id, a.appointment_date, a.appointment_time, a.location,
                a.status, a.status_note, a.created_at,
                u.first_name, u.last_name,
                p.specialty, p.hospital_clinic
         FROM appointments a
         JOIN psychologists p ON a.psychologist_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE a.user_id = ? AND a.active_flag = 1
         ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
        [user_id]
      );
      res.json(rows);
    } catch (error) {
      console.error('GetMyAppointments error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ยกเลิกนัดหมาย (user)
  cancelAppointment: async (req, res) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const [rows] = await db.query(
        'SELECT id, status FROM appointments WHERE id = ? AND user_id = ?',
        [id, user_id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบการนัดหมาย' });
      }

      if (rows[0].status !== 'pending') {
        return res.status(400).json({ message: 'ไม่สามารถยกเลิกได้ เนื่องจากสถานะไม่ใช่ pending' });
      }

      await db.query(
        `UPDATE appointments SET status = 'cancelled', updated_by = ? WHERE id = ?`,
        [user_id, id]
      );

      res.json({ message: 'ยกเลิกนัดหมายสำเร็จ' });
    } catch (error) {
      console.error('CancelAppointment error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงการนัดหมายของนักจิต
  getPsychologistAppointments: async (req, res) => {
    try {
      const user_id = req.user.id;

      const [psy] = await db.query(
        'SELECT id FROM psychologists WHERE user_id = ?',
        [user_id]
      );

      if (psy.length === 0) {
        return res.status(404).json({ message: 'ไม่พบข้อมูลนักจิตวิทยา' });
      }

      const [rows] = await db.query(
        `SELECT a.id, a.user_id, a.appointment_date, a.appointment_time, a.location,
                a.status, a.status_note, a.created_at,
                u.first_name, u.last_name, u.phone, u.email
         FROM appointments a
         JOIN users u ON a.user_id = u.id
         WHERE a.psychologist_id = ? AND a.active_flag = 1
         ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
        [psy[0].id]
      );
      res.json(rows);
    } catch (error) {
      console.error('GetPsychologistAppointments error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // อนุมัติ/ปฏิเสธนัดหมาย (นักจิต)
  updateAppointmentStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, status_note } = req.body;
      const user_id = req.user.id;

      if (!['approved', 'rejected', 'completed'].includes(status)) {
        return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
      }

      await db.query(
        `UPDATE appointments SET status = ?, status_note = ?, updated_by = ? WHERE id = ?`,
        [status, status_note, user_id, id]
      );

      res.json({ message: 'อัพเดทสถานะสำเร็จ' });
    } catch (error) {
      console.error('UpdateAppointmentStatus error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // นักจิตนัดหมายแทนผู้ป่วย
  createAppointmentByPsy: async (req, res) => {
    try {
      const { user_id, appointment_date, appointment_time, location, note } = req.body;
      const psy_user_id = req.user.id;

    // หา psychologist_id จาก user ที่ login อยู่
      const [psy] = await db.query(
        'SELECT id FROM psychologists WHERE user_id = ?',
        [psy_user_id]
      );
      if (psy.length === 0) {
        return res.status(404).json({ message: 'ไม่พบข้อมูลนักจิตวิทยา' });
      }

      const [result] = await db.query(
        `INSERT INTO appointments 
          (user_id, psychologist_id, appointment_date, appointment_time, location, status, status_note, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?, 'approved', ?, ?, ?)`,
          [user_id, psy[0].id, appointment_date, appointment_time, location, note, psy_user_id, psy_user_id]
        );

      res.status(201).json({
        message: 'นัดหมายครั้งถัดไปสำเร็จ',
        appointment_id: result.insertId
      });
    } catch (error) {
      console.error('CreateAppointmentByPsy error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },
};

module.exports = appointmentController;