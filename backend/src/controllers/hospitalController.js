const db = require('../config/db');

const hospitalController = {

  // ดึงรายการโรงพยาบาลทั้งหมด
  getAllHospitals: async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT id, name, address, phone, status, created_at
         FROM hospitals WHERE active_flag = 1 ORDER BY name ASC`
      );
      res.json(rows);
    } catch (error) {
      console.error('GetAllHospitals error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // สร้างโรงพยาบาล
  createHospital: async (req, res) => {
    try {
      const { name, address, phone, status } = req.body;
      const admin_id = req.user.id;

      const [result] = await db.query(
        `INSERT INTO hospitals (name, address, phone, status, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, address, phone, status || 'active', admin_id, admin_id]
      );

      res.status(201).json({ message: 'สร้างโรงพยาบาลสำเร็จ', hospital_id: result.insertId });
    } catch (error) {
      console.error('CreateHospital error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // แก้ไขโรงพยาบาล
  updateHospital: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, address, phone, status } = req.body;
      const admin_id = req.user.id;

      await db.query(
        `UPDATE hospitals SET name = ?, address = ?, phone = ?, status = ?, updated_by = ?
         WHERE id = ?`,
        [name, address, phone, status, admin_id, id]
      );

      res.json({ message: 'แก้ไขข้อมูลสำเร็จ' });
    } catch (error) {
      console.error('UpdateHospital error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ลบโรงพยาบาล (soft delete)
  deleteHospital: async (req, res) => {
    try {
      const { id } = req.params;
      const admin_id = req.user.id;

      await db.query(
        'UPDATE hospitals SET active_flag = 0, updated_by = ? WHERE id = ?',
        [admin_id, id]
      );

      res.json({ message: 'ลบโรงพยาบาลสำเร็จ' });
    } catch (error) {
      console.error('DeleteHospital error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงนักจิตวิทยาตามโรงพยาบาล
  getPsychologistsByHospital: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query(
        `SELECT p.id, p.license_number, p.specialty, p.hospital_id, p.phone,
                p.experience_years, p.bio,
                u.id as user_id, u.first_name, u.last_name, u.email
         FROM psychologists p
         JOIN users u ON p.user_id = u.id
         WHERE p.hospital_id = ? AND p.active_flag = 1 AND u.status = 'active'`,
        [id]
      );
      res.json(rows);
    } catch (error) {
      console.error('GetPsychologistsByHospital error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงนักจิตวิทยาคนอื่นในโรงพยาบาลเดียวกับนักจิตปัจจุบัน (ใช้ตอนขอเปลี่ยนนักจิตวิทยา)
  getPsychologistsSameHospital: async (req, res) => {
    try {
      const { current_psy_id } = req.params;
      const [current] = await db.query(
        'SELECT hospital_id FROM psychologists WHERE id = ?',
        [current_psy_id]
      );
      if (current.length === 0 || !current[0].hospital_id) {
        return res.json([]);
      }
      const [rows] = await db.query(
        `SELECT p.id as psychologist_id, u.id as user_id, u.first_name, u.last_name, p.specialty
         FROM psychologists p
         JOIN users u ON p.user_id = u.id
         WHERE p.hospital_id = ? AND p.id != ? AND p.active_flag = 1 AND u.status = 'active'`,
        [current[0].hospital_id, current_psy_id]
      );
      res.json(rows);
    } catch (error) {
      console.error('GetPsychologistsSameHospital error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // เพิ่มนักจิตวิทยาเข้าโรงพยาบาล
  assignPsychologist: async (req, res) => {
    try {
      const { id } = req.params;
      const { psychologist_id } = req.body;
      const admin_id = req.user.id;

      await db.query(
        'UPDATE psychologists SET hospital_id = ?, updated_by = ? WHERE id = ?',
        [id, admin_id, psychologist_id]
      );

      res.json({ message: 'เพิ่มนักจิตวิทยาเข้าโรงพยาบาลสำเร็จ' });
    } catch (error) {
      console.error('AssignPsychologist error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ลบนักจิตวิทยาออกจากโรงพยาบาล
  removePsychologist: async (req, res) => {
    try {
      const { psy_id } = req.params;
      const admin_id = req.user.id;

      await db.query(
        'UPDATE psychologists SET hospital_id = NULL, updated_by = ? WHERE id = ?',
        [admin_id, psy_id]
      );

      res.json({ message: 'ลบนักจิตวิทยาออกจากโรงพยาบาลสำเร็จ' });
    } catch (error) {
      console.error('RemovePsychologist error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },
};

module.exports = hospitalController;
