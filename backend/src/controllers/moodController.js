const db = require('../config/db');

const moodController = {

  // บันทึกหรืออัพเดท mood ประจำวัน
  saveMood: async (req, res) => {
    try {
      const { mood_date, mood_score, answers, note } = req.body;
      const user_id = req.user.id;

      // เช็คว่าวันนี้บันทึกไปแล้วหรือยัง
      const [existing] = await db.query(
        'SELECT id FROM mood_tracking WHERE user_id = ? AND mood_date = ?',
        [user_id, mood_date]
      );

      if (existing.length > 0) {
        // อัพเดทถ้ามีอยู่แล้ว
        await db.query(
          `UPDATE mood_tracking 
           SET mood_score = ?, answers = ?, note = ?, updated_by = ?
           WHERE user_id = ? AND mood_date = ?`,
          [mood_score, JSON.stringify(answers), note, user_id, user_id, mood_date]
        );
        return res.json({ message: 'อัพเดทข้อมูลสำเร็จ' });
      }

      // สร้างใหม่ถ้ายังไม่มี
      await db.query(
        `INSERT INTO mood_tracking 
         (user_id, mood_date, mood_score, answers, note, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user_id, mood_date, mood_score, JSON.stringify(answers), note, user_id, user_id]
      );

      res.status(201).json({ message: 'บันทึกข้อมูลสำเร็จ' });
    } catch (error) {
      console.error('SaveMood error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงข้อมูล mood ของวันที่เลือก
  getMoodByDate: async (req, res) => {
    try {
      const { date } = req.params;
      const user_id = req.user.id;

      const [rows] = await db.query(
        'SELECT * FROM mood_tracking WHERE user_id = ? AND mood_date = ? AND active_flag = 1',
        [user_id, date]
      );

      if (rows.length === 0) {
        return res.json(null);
      }
      res.json(rows[0]);
    } catch (error) {
      console.error('GetMoodByDate error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงข้อมูล mood ทั้งหมดของ user (สำหรับปฏิทิน)
  getMyMoods: async (req, res) => {
    try {
      const user_id = req.user.id;
      const { year, month } = req.query;

      let query = 'SELECT mood_date, mood_score, note FROM mood_tracking WHERE user_id = ? AND active_flag = 1';
      const params = [user_id];

      if (year && month) {
        query += ' AND YEAR(mood_date) = ? AND MONTH(mood_date) = ?';
        params.push(year, month);
      }

      query += ' ORDER BY mood_date DESC';

      const [rows] = await db.query(query, params);
      res.json(rows);
    } catch (error) {
      console.error('GetMyMoods error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },
};

module.exports = moodController;