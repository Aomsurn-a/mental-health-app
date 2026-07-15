const db = require('../config/db');

const complaintController = {

  // ส่งคำร้อง (user/นักจิต)
  createComplaint: async (req, res) => {
    try {
      const { type, detail, target_id } = req.body;
      const sender_id = req.user.id;

      const [result] = await db.query(
        `INSERT INTO complaints 
         (sender_id, target_id, type, detail, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sender_id, target_id || null, type, detail, sender_id, sender_id]
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
        `SELECT id, type, detail, status, resolved_note, created_at
         FROM complaints
         WHERE sender_id = ? AND active_flag = 1
         ORDER BY created_at DESC`,
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
        `SELECT c.id, c.type, c.detail, c.status, c.resolved_note, c.created_at,
                u.first_name, u.last_name, u.email
         FROM complaints c
         JOIN users u ON c.sender_id = u.id
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
};

module.exports = complaintController;