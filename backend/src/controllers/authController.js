const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authController = {

  // Register
  register: async (req, res) => {
    try {
      const { username, email, password, first_name, last_name, phone, province, role } = req.body;

      // เช็คว่า email หรือ username ซ้ำไหม
      const [existing] = await db.query(
        'SELECT id FROM users WHERE email = ? OR username = ?',
        [email, username]
      );
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Email หรือ Username นี้ถูกใช้แล้ว' });
      }

      // เข้ารหัส password
      const hashedPassword = await bcrypt.hash(password, 10);

      // บันทึกลง database
      const [result] = await db.query(
        `INSERT INTO users 
          (username, email, password, first_name, last_name, phone, province, role, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [username, email, hashedPassword, first_name, last_name, phone, province, role || 'user']
      );

      if ((role || 'user') === 'user') {
        await db.query(
          `INSERT INTO patients (user_id, created_by) VALUES (?, ?)`,
          [result.insertId, result.insertId]
        );
      }

      // สร้าง token
      const token = jwt.sign(
        { id: result.insertId, role: role || 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'สมัครสมาชิกสำเร็จ',
        token,
        user: {
          id: result.insertId,
          username,
          email,
          first_name,
          last_name,
          role: role || 'user'
        }
      });

    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
    }
  },

  // Login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // หา user จาก email
      const [users] = await db.query(
        'SELECT * FROM users WHERE email = ? AND active_flag = 1',
        [email]
      );
      if (users.length === 0) {
        return res.status(401).json({ message: 'Email หรือรหัสผ่านไม่ถูกต้อง' });
      }

      const user = users[0];

      // เช็ค status
      if (user.status !== 'active') {
        return res.status(403).json({ message: 'บัญชีนี้ถูกระงับการใช้งาน' });
      }

      // ตรวจสอบ password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Email หรือรหัสผ่านไม่ถูกต้อง' });
      }

      // สร้าง token
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'เข้าสู่ระบบสำเร็จ',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
    }
  },

  // Get current user
  getMe: async (req, res) => {
    try {
      const [users] = await db.query(
        'SELECT id, username, email, first_name, last_name, role, phone, province, status FROM users WHERE id = ?',
        [req.user.id]
      );
      if (users.length === 0) {
        return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
      }
      res.json(users[0]);
    } catch (error) {
      console.error('GetMe error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
    }
  },

  // แก้ไขข้อมูลส่วนตัว
  updateProfile: async (req, res) => {
    try {
      const { first_name, last_name, phone, province } = req.body;
      const user_id = req.user.id;

      await db.query(
        `UPDATE users SET first_name = ?, last_name = ?, phone = ?, province = ?, updated_by = ?
         WHERE id = ?`,
        [first_name, last_name, phone, province, user_id, user_id]
      );

      res.json({ message: 'อัพเดทข้อมูลสำเร็จ' });
    } catch (error) {
      console.error('UpdateProfile error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

   // เปลี่ยนรหัสผ่าน
  changePassword: async (req, res) => {
    try {
      const { old_password, new_password } = req.body;
      const user_id = req.user.id;

      // เช็ค password เดิม
      const [users] = await db.query(
        'SELECT password FROM users WHERE id = ?',
        [user_id]
      );

      const isMatch = await bcrypt.compare(old_password, users[0].password);
      if (!isMatch) {
        return res.status(400).json({ message: 'รหัสผ่านเดิมไม่ถูกต้อง' });
      }

      const hashedPassword = await bcrypt.hash(new_password, 10);
      await db.query(
        'UPDATE users SET password = ?, updated_by = ? WHERE id = ?',
        [hashedPassword, user_id, user_id]
      );

      res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (error) {
      console.error('ChangePassword error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },
  
};

module.exports = authController;