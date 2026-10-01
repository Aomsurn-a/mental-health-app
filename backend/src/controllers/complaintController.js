const db = require('../config/db');

const complaintController = {

  // ส่งคำร้อง (user/นักจิต)
  createComplaint: async (req, res) => {
    try {
      const { type, detail, target_id, full_legal_name, replacement_gender } = req.body;
      const sender_id = req.user.id;

      // ยืนยันว่าผู้สมัครเปลี่ยนนักจิตเป็นคนในคลินิกเดิมและไม่เคยนัดหมายด้วยมาก่อน
      if (type === 'change_psychologist') {
        if (!target_id || !['male', 'female'].includes(replacement_gender)) {
          return res.status(400).json({ message: 'กรุณาเลือกเพศและสุ่มนักจิตคนใหม่ก่อนส่งคำร้อง' });
        }
        const [current] = await db.query(
          `SELECT p.hospital_id FROM appointments a JOIN psychologists p ON p.id = a.psychologist_id
           WHERE a.user_id = ? AND a.active_flag = 1 AND a.status IN ('approved', 'completed')
           ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 1`, [sender_id]
        );
        if (!current.length || !current[0].hospital_id) return res.status(400).json({ message: 'ไม่พบคลินิกของนักจิตวิทยาปัจจุบัน' });
        const [candidate] = await db.query(
          `SELECT p.id FROM psychologists p JOIN users u ON u.id = p.user_id
           JOIN hospitals h ON h.id = p.hospital_id AND h.active_flag = 1 AND h.status = 'active'
           WHERE p.user_id = ? AND p.hospital_id = ? AND p.gender = ? AND p.active_flag = 1 AND u.status = 'active'
             AND NOT EXISTS (SELECT 1 FROM appointments old WHERE old.user_id = ? AND old.psychologist_id = p.id AND old.active_flag = 1)`,
          [target_id, current[0].hospital_id, replacement_gender, sender_id]
        );
        if (!candidate.length) return res.status(400).json({ message: 'นักจิตคนใหม่ไม่ตรงกับเพศ/คลินิกที่เลือก หรือเคยมีนัดหมายกับคุณแล้ว กรุณาสุ่มใหม่' });
      }

      const [result] = await db.query(
        `INSERT INTO complaints
         (sender_id, target_id, full_legal_name, type, detail, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sender_id, target_id || null, full_legal_name || null, type, detail, sender_id, sender_id]
      );

      res.status(201).json({
        message: 'ส่งคำร้องสำเร็จ',
        complaint_id: result.insertId
      });
    } catch (error) {
      console.error('CreateComplaint error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงคำร้องของตัวเอง
  getMyComplaints: async (req, res) => {
    try {
      const sender_id = req.user.id;
      const [rows] = await db.query(
        `SELECT c.id, c.type, c.detail, c.status, c.resolved_note, c.created_at,
                hr.id as hospital_report_id
         FROM complaints c
         LEFT JOIN hospital_reports hr ON hr.complaint_id = c.id
         WHERE c.sender_id = ? AND c.active_flag = 1
         ORDER BY c.created_at DESC`,
        [sender_id]
      );
      res.json(rows);
    } catch (error) {
      console.error('GetMyComplaints error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงคำร้องทั้งหมด (Admin)
  getAllComplaints: async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT c.id, c.sender_id, c.target_id, c.type, c.detail, c.status, c.resolved_note, c.created_at,
                u.first_name, u.last_name, u.email,
                tu.first_name as target_first_name, tu.last_name as target_last_name
         FROM complaints c
         JOIN users u ON c.sender_id = u.id
         LEFT JOIN users tu ON c.target_id = tu.id
         WHERE c.active_flag = 1
         ORDER BY c.created_at DESC`
      );
      res.json(rows);
    } catch (error) {
      console.error('GetAllComplaints error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // อัพเดทสถานะคำร้อง (Admin)
  updateComplaintStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, resolved_note } = req.body;
      const user_id = req.user.id;

      await db.query(
        `UPDATE complaints SET status = ?, resolved_note = ?, updated_by = ? WHERE id = ?`,
        [status, resolved_note, user_id, id]
      );

      res.json({ message: 'อัพเดทสถานะสำเร็จ' });
    } catch (error) {
      console.error('UpdateComplaintStatus error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // นักจิต: ดึงแจ้งเตือนความเสี่ยงจาก AI ของผู้ป่วยในความดูแล ที่ยังไม่ resolved
  getMyAiAlerts: async (req, res) => {
    try {
      const psychologist_user_id = req.user.id;
      const [rows] = await db.query(
        `SELECT c.id, c.sender_id, c.detail, c.status, c.created_at,
                u.first_name, u.last_name
         FROM complaints c
         JOIN users u ON u.id = c.sender_id
         WHERE c.type = 'ai_risk_alert' AND c.status = 'pending' AND c.active_flag = 1
         AND (c.target_id = ? OR (c.target_id IS NULL AND c.sender_id IN (
           SELECT a.user_id FROM appointments a
           JOIN psychologists p ON a.psychologist_id = p.id
           WHERE p.user_id = ? AND a.active_flag = 1
         )))
         ORDER BY c.created_at DESC`,
        [psychologist_user_id, psychologist_user_id]
      );
      res.json(rows);
    } catch (error) {
      console.error('GetMyAiAlerts error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // นักจิต: รับทราบการแจ้งเตือนความเสี่ยงจาก AI
  acknowledgeAiAlert: async (req, res) => {
    try {
      const psychologist_user_id = req.user.id;
      const { id } = req.params;

      const [result] = await db.query(
        `UPDATE complaints c SET c.status = 'in_progress', c.updated_by = ?
         WHERE c.id = ? AND c.type = 'ai_risk_alert' AND c.active_flag = 1
           AND (c.target_id = ? OR (c.target_id IS NULL AND c.sender_id IN (
             SELECT a.user_id FROM appointments a JOIN psychologists p ON p.id = a.psychologist_id
             WHERE p.user_id = ? AND a.active_flag = 1
           )))`,
        [psychologist_user_id, id, psychologist_user_id, psychologist_user_id]
      );
      if (!result.affectedRows) return res.status(404).json({ message: 'ไม่พบการแจ้งเตือนในความดูแลของคุณ' });

      res.json({ message: 'รับทราบเรียบร้อย' });
    } catch (error) {
      console.error('AcknowledgeAiAlert error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },
};

module.exports = complaintController;
