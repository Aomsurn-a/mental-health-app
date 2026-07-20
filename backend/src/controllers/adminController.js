const db = require('../config/db');
const bcrypt = require('bcryptjs');

const adminController = {

  // ดึง user ทั้งหมด
  getAllUsers: async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT id, username, email, first_name, last_name, role, phone, province, status, created_at
         FROM users WHERE active_flag = 1 ORDER BY created_at DESC`
      );
      res.json(rows);
    } catch (error) {
      console.error('GetAllUsers error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // สร้าง user ใหม่
  createUser: async (req, res) => {
    try {
      const { username, email, password, first_name, last_name, role, phone, province } = req.body;
      const admin_id = req.user.id;

      const [existing] = await db.query(
        'SELECT id FROM users WHERE email = ? OR username = ?',
        [email, username]
      );
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Email หรือ Username นี้ถูกใช้แล้ว' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await db.query(
        `INSERT INTO users (username, email, password, first_name, last_name, role, phone, province, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [username, email, hashedPassword, first_name, last_name, role || 'user', phone, province, admin_id, admin_id]
      );

      // ถ้าเป็น user ให้สร้าง patient อัตโนมัติ
      if ((role || 'user') === 'user') {
        await db.query(
          'INSERT INTO patients (user_id, created_by) VALUES (?, ?)',
          [result.insertId, admin_id]
        );
      }

      // ถ้าเป็นนักจิตต้องการข้อมูลเพิ่ม
      if (role === 'psychologist') {
        const { license_number, specialty, hospital_clinic, experience_years, bio } = req.body;
        await db.query(
          `INSERT INTO psychologists (user_id, license_number, specialty, hospital_clinic, experience_years, bio, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [result.insertId, license_number, specialty, hospital_clinic, experience_years || 0, bio, admin_id]
        );
      }

      res.status(201).json({ message: 'สร้างบัญชีสำเร็จ', user_id: result.insertId });
    } catch (error) {
      console.error('CreateUser error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // แก้ไข user
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { first_name, last_name, phone, province, status } = req.body;
      const admin_id = req.user.id;

      await db.query(
        `UPDATE users SET first_name = ?, last_name = ?, phone = ?, province = ?, status = ?, updated_by = ?
         WHERE id = ?`,
        [first_name, last_name, phone, province, status, admin_id, id]
      );

      res.json({ message: 'แก้ไขข้อมูลสำเร็จ' });
    } catch (error) {
      console.error('UpdateUser error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // รีเซ็ต password
  resetPassword: async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      const admin_id = req.user.id;

      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE users SET password = ?, updated_by = ? WHERE id = ?',
        [hashedPassword, admin_id, id]
      );

      res.json({ message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
    } catch (error) {
      console.error('ResetPassword error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ลบ user (soft delete)
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;
      const admin_id = req.user.id;

      await db.query(
        'UPDATE users SET active_flag = 0, updated_by = ? WHERE id = ?',
        [admin_id, id]
      );

      res.json({ message: 'ลบบัญชีสำเร็จ' });
    } catch (error) {
      console.error('DeleteUser error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงคำร้องทั้งหมด
  getAllComplaints: async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT c.id, c.type, c.detail, c.status, c.resolved_note, c.created_at,
                u.first_name, u.last_name, u.email, u.role
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

  // อัพเดทสถานะคำร้อง
  updateComplaintStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, resolved_note } = req.body;
      const admin_id = req.user.id;

      await db.query(
        'UPDATE complaints SET status = ?, resolved_note = ?, updated_by = ? WHERE id = ?',
        [status, resolved_note, admin_id, id]
      );

      res.json({ message: 'อัพเดทสถานะสำเร็จ' });
    } catch (error) {
      console.error('UpdateComplaintStatus error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // สถิติภาพรวม
  getDashboardStats: async (req, res) => {
    try {
      const [[{ total_users }]] = await db.query(
        "SELECT COUNT(*) as total_users FROM users WHERE role = 'user' AND active_flag = 1"
      );
      const [[{ total_psychologists }]] = await db.query(
        "SELECT COUNT(*) as total_psychologists FROM users WHERE role = 'psychologist' AND active_flag = 1"
      );
      const [[{ total_appointments }]] = await db.query(
        'SELECT COUNT(*) as total_appointments FROM appointments WHERE active_flag = 1'
      );
      const [[{ pending_complaints }]] = await db.query(
        "SELECT COUNT(*) as pending_complaints FROM complaints WHERE status = 'pending' AND active_flag = 1"
      );

      res.json({ total_users, total_psychologists, total_appointments, pending_complaints });
    } catch (error) {
      console.error('GetDashboardStats error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },
};

module.exports = adminController;