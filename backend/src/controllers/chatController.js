const db = require('../config/db');
const { canChat, validId } = require('../services/chatAccess');

async function checkPartner(req, res, id) {
  if (!validId(id)) { res.status(400).json({ message: 'กรุณาเลือกผู้รับข้อความ' }); return false; }
  if (!await canChat(req.user.id, Number(id))) {
    res.status(403).json({ message: 'ไม่สามารถสนทนากับบัญชีนี้ได้ กรุณาตรวจสอบผู้รับหรือสถานะบัญชี' });
    return false;
  }
  return true;
}

const chatController = {
  getChatList: async (req, res) => {
    try {
      const id = req.user.id;
      const [rows] = await db.query(
        `SELECT u.id, u.first_name, u.last_name, u.email, p.specialty, h.name AS hospital_clinic,
          (SELECT m.message FROM chat_messages m WHERE m.active_flag = 1
            AND ((m.sender_id = ? AND m.receiver_id = u.id) OR (m.sender_id = u.id AND m.receiver_id = ?))
            ORDER BY m.id DESC LIMIT 1) AS last_message,
          (SELECT m.sent_at FROM chat_messages m WHERE m.active_flag = 1
            AND ((m.sender_id = ? AND m.receiver_id = u.id) OR (m.sender_id = u.id AND m.receiver_id = ?))
            ORDER BY m.id DESC LIMIT 1) AS last_message_at,
          (SELECT COUNT(*) FROM chat_messages m WHERE m.active_flag = 1
            AND m.sender_id = u.id AND m.receiver_id = ? AND m.is_read = 0) AS unread_count,
          (SELECT m.sent_at FROM chat_messages m WHERE m.active_flag = 1
            AND m.sender_id = ? AND m.receiver_id = u.id ORDER BY m.id DESC LIMIT 1) AS my_last_sent_at,
          (SELECT m.is_read FROM chat_messages m WHERE m.active_flag = 1
            AND m.sender_id = ? AND m.receiver_id = u.id ORDER BY m.id DESC LIMIT 1) AS my_last_sent_read
         FROM users u LEFT JOIN psychologists p ON p.user_id = u.id
         LEFT JOIN hospitals h ON h.id = p.hospital_id
         WHERE u.active_flag = 1 AND u.status = 'active'
           AND ((? = 'user' AND u.role = 'psychologist' AND p.active_flag = 1)
           OR (? = 'psychologist' AND u.role = 'user' AND (
             EXISTS (SELECT 1 FROM appointments a JOIN psychologists cp ON cp.id = a.psychologist_id
                     WHERE cp.user_id = ? AND a.user_id = u.id AND a.active_flag = 1
                       AND a.status IN ('pending','approved','completed'))
             OR EXISTS (SELECT 1 FROM chat_messages m WHERE m.active_flag = 1
                        AND ((m.sender_id = ? AND m.receiver_id = u.id)
                          OR (m.sender_id = u.id AND m.receiver_id = ?)))
           )))
         ORDER BY last_message_at DESC, u.id ASC`,
        [id,id,id,id,id,id,id,req.user.role,req.user.role,id,id,id]
      );
      res.json(rows);
    } catch (error) {
      console.error('GetChatList:', error.code);
      res.status(500).json({ message: 'โหลดรายชื่อไม่สำเร็จ กรุณาลองใหม่' });
    }
  },
  getMessages: async (req, res) => {
    try {
      const partner = Number(req.params.partner_id);
      if (!await checkPartner(req,res,partner)) return;
      const [rows] = await db.query(
        `SELECT id,sender_id,receiver_id,message,is_read,sent_at FROM chat_messages
         WHERE active_flag = 1 AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         ORDER BY id ASC`, [req.user.id,partner,partner,req.user.id]
      );
      await db.query(
        'UPDATE chat_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND active_flag = 1 AND is_read = 0',
        [partner,req.user.id]
      );
      res.json(rows);
    } catch (error) {
      console.error('GetMessages:', error.code);
      res.status(500).json({ message: 'โหลดข้อความไม่สำเร็จ กรุณาลองใหม่' });
    }
  },
  sendMessage: async (req, res) => {
    try {
      const { receiver_id, message } = req.body;
      if (typeof message !== 'string' || !message.trim() || message.length > 5000) {
        return res.status(400).json({ message: 'กรุณาพิมพ์ข้อความไม่เกิน 5,000 ตัวอักษร' });
      }
      if (!await checkPartner(req,res,receiver_id)) return;
      const [result] = await db.query(
        'INSERT INTO chat_messages(sender_id,receiver_id,message,created_by,updated_by) VALUES(?,?,?,?,?)',
        [req.user.id,Number(receiver_id),message.trim(),req.user.id,req.user.id]
      );
      const [rows] = await db.query(
        'SELECT id,sender_id,receiver_id,message,is_read,sent_at FROM chat_messages WHERE id = ?', [result.insertId]
      );
      res.status(201).json({ message: 'ส่งข้อความสำเร็จ', data: rows[0] });
    } catch (error) {
      console.error('SendMessage:', error.code);
      res.status(500).json({ message: 'ส่งข้อความไม่สำเร็จ กรุณาลองใหม่ ข้อความยังอยู่ในช่องพิมพ์' });
    }
  },
  getNewMessages: async (req, res) => {
    try {
      const partner = Number(req.query.partner_id);
      const lastId = Number(req.query.last_id || 0);
      if (!Number.isSafeInteger(lastId) || lastId < 0) return res.status(400).json({ message: 'ตำแหน่งข้อความไม่ถูกต้อง' });
      if (!await checkPartner(req,res,partner)) return;
      const [rows] = await db.query(
        `SELECT id,sender_id,receiver_id,message,is_read,sent_at FROM chat_messages
         WHERE active_flag = 1 AND id > ?
           AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         ORDER BY id ASC`, [lastId,req.user.id,partner,partner,req.user.id]
      );
      await db.query(
        'UPDATE chat_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND active_flag = 1 AND is_read = 0',
        [partner,req.user.id]
      );
      res.json(rows);
    } catch (error) {
      console.error('GetNewMessages:', error.code);
      res.status(500).json({ message: 'โหลดข้อความใหม่ไม่สำเร็จ กรุณาลองใหม่' });
    }
  },
};
module.exports = chatController;
