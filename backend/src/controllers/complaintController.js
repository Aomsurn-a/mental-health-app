const db = require('../config/db');

const complaintController = {

  // ส่งคำร้อง (user/นักจิต)
  createComplaint: async (req, res) => {
    try {
      const { type, detail, target_id, full_legal_name } = req.body;
      const sender_id = req.user.id;

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
         WHERE c.type = 'ai_risk_alert' AND c.status != 'resolved' AND c.active_flag = 1
         AND c.sender_id IN (
           SELECT a.user_id FROM appointments a
           JOIN psychologists p ON a.psychologist_id = p.id
           WHERE p.user_id = ? AND a.active_flag = 1
         )
         ORDER BY c.created_at DESC`,
        [psychologist_user_id]
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

      await db.query(
        `UPDATE complaints c
         JOIN (
           SELECT a.user_id FROM appointments a
           JOIN psychologists p ON a.psychologist_id = p.id
           WHERE p.user_id = ? AND a.active_flag = 1
         ) patients ON patients.user_id = c.sender_id
         SET c.status = 'in_progress', c.updated_by = ?
         WHERE c.id = ? AND c.type = 'ai_risk_alert'`,
        [psychologist_user_id, psychologist_user_id, id]
      );

      res.json({ message: 'รับทราบเรียบร้อย' });
    } catch (error) {
      console.error('AcknowledgeAiAlert error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },
};

module.exports = complaintController;