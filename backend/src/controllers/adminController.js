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
        const { license_number, specialty, hospital_id, experience_years, bio } = req.body;
        await db.query(
          `INSERT INTO psychologists (user_id, license_number, specialty, hospital_id, experience_years, bio, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [result.insertId, license_number, specialty, hospital_id || null, experience_years || 0, bio, admin_id]
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

  // สถิติภาพรวมระบบทั้งหมด (สำหรับหน้า Dashboard ของ admin)
  getDashboardStats: async (req, res) => {
    try {
      const [[userCounts]] = await db.query(
        `SELECT
          SUM(role = 'user') as total_users,
          SUM(role = 'psychologist') as total_psychologists,
          SUM(role = 'admin') as total_admins,
          SUM(role = 'psychologist' AND status = 'suspended') as suspended_psychologists
         FROM users WHERE active_flag = 1`
      );

      const [apptRows] = await db.query(
        `SELECT status, COUNT(*) as cnt FROM appointments WHERE active_flag = 1 GROUP BY status`
      );
      const [[{ today_appointments }]] = await db.query(
        `SELECT COUNT(*) as today_appointments FROM appointments
         WHERE active_flag = 1 AND appointment_date = CURDATE() AND status = 'approved'`
      );

      const [complaintStatusRows] = await db.query(
        `SELECT status, COUNT(*) as cnt FROM complaints WHERE active_flag = 1 GROUP BY status`
      );
      const [complaintTypeRows] = await db.query(
        `SELECT type, COUNT(*) as cnt FROM complaints
         WHERE active_flag = 1 AND status = 'pending' GROUP BY type`
      );

      const [[reportCounts]] = await db.query(
        `SELECT
          SUM(status = 'pending') as psychologist_pending,
          SUM(status = 'confirmed') as psychologist_confirmed
         FROM psychologist_reports`
      );
      const [[{ hospital_reports_total }]] = await db.query(
        'SELECT COUNT(*) as hospital_reports_total FROM hospital_reports'
      );

      const [[hospitalCounts]] = await db.query(
        `SELECT COUNT(*) as total, SUM(status = 'active') as active FROM hospitals WHERE active_flag = 1`
      );

      const [recentComplaints] = await db.query(
        `SELECT c.id, c.type, c.status, c.created_at, u.first_name, u.last_name
         FROM complaints c JOIN users u ON c.sender_id = u.id
         WHERE c.active_flag = 1
         ORDER BY c.created_at DESC LIMIT 5`
      );

      const [recentReports] = await db.query(
        `SELECT r.id, r.penalty_type, r.report_count, r.status, r.created_at, u.first_name, u.last_name
         FROM psychologist_reports r
         JOIN psychologists p ON r.psychologist_id = p.id
         JOIN users u ON p.user_id = u.id
         ORDER BY r.created_at DESC LIMIT 5`
      );

      const apptByStatus = { pending: 0, approved: 0, completed: 0, rejected: 0, cancelled: 0 };
      let total_appointments = 0;
      apptRows.forEach(r => { apptByStatus[r.status] = r.cnt; total_appointments += r.cnt; });

      const complaintByStatus = { pending: 0, in_progress: 0, resolved: 0, rejected: 0 };
      let total_complaints = 0;
      complaintStatusRows.forEach(r => { complaintByStatus[r.status] = r.cnt; total_complaints += r.cnt; });

      const pendingComplaintsByType = { change_psychologist: 0, report_system: 0, report_psychologist: 0, other: 0 };
      complaintTypeRows.forEach(r => { pendingComplaintsByType[r.type] = r.cnt; });

      res.json({
        users: {
          total_users: Number(userCounts.total_users) || 0,
          total_psychologists: Number(userCounts.total_psychologists) || 0,
          total_admins: Number(userCounts.total_admins) || 0,
          suspended_psychologists: Number(userCounts.suspended_psychologists) || 0,
        },
        appointments: {
          total: total_appointments,
          today: today_appointments,
          by_status: apptByStatus,
        },
        complaints: {
          total: total_complaints,
          by_status: complaintByStatus,
          pending_by_type: pendingComplaintsByType,
        },
        reports: {
          psychologist_pending: Number(reportCounts.psychologist_pending) || 0,
          psychologist_confirmed: Number(reportCounts.psychologist_confirmed) || 0,
          hospital_total: hospital_reports_total || 0,
        },
        hospitals: {
          total: Number(hospitalCounts.total) || 0,
          active: Number(hospitalCounts.active) || 0,
        },
        recent_complaints: recentComplaints,
        recent_reports: recentReports,
      });
    } catch (error) {
      console.error('GetDashboardStats error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },
};

module.exports = adminController;