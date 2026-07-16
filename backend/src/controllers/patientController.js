const db = require('../config/db');

const patientController = {

  // ดึงรายชื่อผู้ป่วยของนักจิต
  getMyPatients: async (req, res) => {
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
        `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, u.phone,
                COUNT(a.id) as total_appointments,
                MAX(a.appointment_date) as last_appointment
         FROM appointments a
         JOIN users u ON a.user_id = u.id
         WHERE a.psychologist_id = ? AND a.active_flag = 1
         GROUP BY u.id, u.first_name, u.last_name, u.email, u.phone
         ORDER BY last_appointment DESC`,
        [psy[0].id]
      );
      res.json(rows);
    } catch (error) {
      console.error('GetMyPatients error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดูประวัติของผู้ป่วย
  getPatientDetail: async (req, res) => {
    try {
      const { patient_id } = req.params;

      const [assessments] = await db.query(
        `SELECT ar.id, ar.score, ar.risk_level, ar.recommendation, ar.taken_at,
                ase.name as set_name
         FROM assessment_results ar
         JOIN assessment_sets ase ON ar.set_id = ase.id
         WHERE ar.user_id = ? AND ar.active_flag = 1
         ORDER BY ar.taken_at DESC`,
        [patient_id]
      );

      const [moods] = await db.query(
        `SELECT mood_date, mood_score, note
         FROM mood_tracking
         WHERE user_id = ? AND active_flag = 1
         ORDER BY mood_date DESC
         LIMIT 30`,
        [patient_id]
      );

      const [appointments] = await db.query(
        `SELECT id, appointment_date, appointment_time, status, status_note
         FROM appointments
         WHERE user_id = ? AND active_flag = 1
         ORDER BY appointment_date DESC`,
        [patient_id]
      );

      // บันทึกการรักษาแต่ละรอบ
      const [records] = await db.query(
        `SELECT pr.id, pr.session_number, pr.symptoms, pr.symptom_cause,
                pr.treatment, pr.treatment_result, pr.treatment_date,
                pr.appointment_id, pr.created_at,
                u.first_name, u.last_name
         FROM patient_records pr
         JOIN psychologists p ON pr.psychologist_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE pr.patient_id = (SELECT id FROM patients WHERE user_id = ?)
         AND pr.active_flag = 1
         ORDER BY pr.session_number ASC`,
        [patient_id]
      );

      res.json({ assessments, moods, appointments, records });
    } catch (error) {
      console.error('GetPatientDetail error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // บันทึกการรักษา
  addPatientRecord: async (req, res) => {
    try {
      const { patient_id, appointment_id, symptoms, symptom_cause, treatment, treatment_result } = req.body;
      const user_id = req.user.id;

      // หา psychologist_id
      const [psy] = await db.query(
        'SELECT id FROM psychologists WHERE user_id = ?',
        [user_id]
      );
      if (psy.length === 0) {
        return res.status(404).json({ message: 'ไม่พบข้อมูลนักจิตวิทยา' });
      }

      // หา actual patient_id จาก user_id
      const [patient] = await db.query(
        'SELECT id FROM patients WHERE user_id = ?',
        [patient_id]
      );
      if (patient.length === 0) {
        return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ป่วย' });
      }
      const actual_patient_id = patient[0].id;

      // คำนวณ session_number (นับทุกครั้งที่คนไข้คนนี้เคยมีบันทึก)
      const [countResult] = await db.query(
        'SELECT COUNT(*) as count FROM patient_records WHERE patient_id = ? AND active_flag = 1',
        [actual_patient_id]
      );
      const session_number = countResult[0].count + 1;

      // เช็คว่านัดรอบนี้มีบันทึกแล้วหรือยัง
      const [existingRecord] = await db.query(
        'SELECT id FROM patient_records WHERE appointment_id = ? AND active_flag = 1',
        [appointment_id]
      );

      if (existingRecord.length > 0) {
        // อัพเดทถ้ามีอยู่แล้ว (หมอคนเดิมแก้ได้)
        await db.query(
          `UPDATE patient_records 
           SET symptoms = ?, symptom_cause = ?, treatment = ?, treatment_result = ?, updated_by = ?
           WHERE appointment_id = ? AND active_flag = 1`,
          [symptoms, symptom_cause, treatment, treatment_result, user_id, appointment_id]
        );
        return res.json({ message: 'อัพเดทบันทึกการรักษาสำเร็จ' });
      }

      // สร้างใหม่
      const [result] = await db.query(
        `INSERT INTO patient_records 
         (patient_id, psychologist_id, appointment_id, session_number, symptoms, symptom_cause, treatment, treatment_result, treatment_date, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)`,
        [actual_patient_id, psy[0].id, appointment_id, session_number, symptoms, symptom_cause, treatment, treatment_result, user_id, user_id]
      );

      res.status(201).json({ 
        message: 'บันทึกการรักษาสำเร็จ', 
        record_id: result.insertId,
        session_number 
      });
    } catch (error) {
      console.error('AddPatientRecord error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงบันทึกการรักษาตาม appointment_id
  getRecordByAppointment: async (req, res) => {
    try {
      const { appointment_id } = req.params;
      const [rows] = await db.query(
        `SELECT pr.id, pr.session_number, pr.symptoms, pr.symptom_cause,
                pr.treatment, pr.treatment_result, pr.treatment_date, pr.created_at
         FROM patient_records pr
         WHERE pr.appointment_id = ? AND pr.active_flag = 1`,
        [appointment_id]
      );
      res.json(rows.length > 0 ? rows[0] : null);
    } catch (error) {
      console.error('GetRecordByAppointment error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงบันทึกการรักษาทั้งหมดของผู้ป่วย
  getPatientRecords: async (req, res) => {
    try {
      const { patient_id } = req.params;
      const [rows] = await db.query(
        `SELECT pr.id, pr.session_number, pr.symptoms, pr.symptom_cause, 
                pr.treatment, pr.treatment_result, pr.treatment_date, pr.appointment_id,
                pr.created_at, u.first_name, u.last_name
         FROM patient_records pr
         JOIN psychologists p ON pr.psychologist_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE pr.patient_id = (SELECT id FROM patients WHERE user_id = ?)
         AND pr.active_flag = 1
         ORDER BY pr.session_number ASC`,
        [patient_id]
      );
      res.json(rows);
    } catch (error) {
      console.error('GetPatientRecords error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },
};

module.exports = patientController;