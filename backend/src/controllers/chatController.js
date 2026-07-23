const db = require('../config/db');

const chatController = {

  // ดึงรายชื่อคนที่คุยด้วยได้ (user → นักจิต, นักจิต → user ที่เคยนัด)
  getChatList: async (req, res) => {
    try {
      const user_id = req.user.id;
      const role = req.user.role;

      let rows;

      if (role === 'user') {
        [rows] = await db.query(
          `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email,
            p.specialty, h.name as hospital_clinic,
            (SELECT message FROM chat_messages
             WHERE (sender_id = ? AND receiver_id = u.id)
             OR (sender_id = u.id AND receiver_id = ?)
             ORDER BY sent_at DESC LIMIT 1) as last_message,
            (SELECT sent_at FROM chat_messages
             WHERE (sender_id = ? AND receiver_id = u.id)
             OR (sender_id = u.id AND receiver_id = ?)
             ORDER BY sent_at DESC LIMIT 1) as last_message_at,
            (SELECT COUNT(*) FROM chat_messages
             WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0) as unread_count
          FROM psychologists p
          JOIN users u ON p.user_id = u.id
          LEFT JOIN hospitals h ON p.hospital_id = h.id
          WHERE p.active_flag = 1 AND u.status = 'active'
          ORDER BY last_message_at DESC`,
          [user_id, user_id, user_id, user_id, user_id]
        );
      } else if (role === 'psychologist') {
        // นักจิตเห็น user ที่เคยนัดด้วย
        [rows] = await db.query(
          `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email,
                  (SELECT message FROM chat_messages 
                   WHERE (sender_id = ? AND receiver_id = u.id)
                   OR (sender_id = u.id AND receiver_id = ?)
                   ORDER BY sent_at DESC LIMIT 1) as last_message,
                  (SELECT sent_at FROM chat_messages 
                   WHERE (sender_id = ? AND receiver_id = u.id)
                   OR (sender_id = u.id AND receiver_id = ?)
                   ORDER BY sent_at DESC LIMIT 1) as last_message_at,
                  (SELECT COUNT(*) FROM chat_messages
                   WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0) as unread_count
           FROM appointments a
           JOIN psychologists p ON a.psychologist_id = p.id
           JOIN users u ON a.user_id = u.id
           WHERE p.user_id = ? AND a.active_flag = 1
           GROUP BY u.id, u.first_name, u.last_name, u.email
           ORDER BY last_message_at DESC`,
          [user_id, user_id, user_id, user_id, user_id, user_id]
        );
      } else {
        rows = [];
      }

      res.json(rows);
    } catch (error) {
      console.error('GetChatList error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงประวัติการสนทนา
  getMessages: async (req, res) => {
    try {
      const user_id = req.user.id;
      const { partner_id } = req.params;

      const [rows] = await db.query(
        `SELECT id, sender_id, receiver_id, message, is_read, sent_at
         FROM chat_messages
         WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND active_flag = 1
         ORDER BY sent_at ASC`,
        [user_id, partner_id, partner_id, user_id]
      );

      // Mark as read
      await db.query(
        `UPDATE chat_messages SET is_read = 1
         WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`,
        [partner_id, user_id]
      );

      res.json(rows);
    } catch (error) {
      console.error('GetMessages error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ส่งข้อความ
  sendMessage: async (req, res) => {
    try {
      const sender_id = req.user.id;
      const { receiver_id, message } = req.body;

      const [result] = await db.query(
        `INSERT INTO chat_messages (sender_id, receiver_id, message, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?)`,
        [sender_id, receiver_id, message, sender_id, sender_id]
      );

      res.status(201).json({
        message: 'ส่งข้อความสำเร็จ',
        data: {
          id: result.insertId,
          sender_id,
          receiver_id,
          message,
          is_read: 0,
          sent_at: new Date()
        }
      });
    } catch (error) {
      console.error('SendMessage error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงข้อความใหม่ (สำหรับ polling)
  getNewMessages: async (req, res) => {
    try {
      const user_id = req.user.id;
      const { partner_id, last_id } = req.query;

      const [rows] = await db.query(
        `SELECT id, sender_id, receiver_id, message, is_read, sent_at
         FROM chat_messages
         WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND id > ? AND active_flag = 1
         ORDER BY sent_at ASC`,
        [user_id, partner_id, partner_id, user_id, last_id || 0]
      );

      if (rows.length > 0) {
        await db.query(
          `UPDATE chat_messages SET is_read = 1
           WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`,
          [partner_id, user_id]
        );
      }

      res.json(rows);
    } catch (error) {
      console.error('GetNewMessages error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },
};

module.exports = chatController;