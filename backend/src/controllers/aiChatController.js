const db = require('../config/db');
const provider = require('../services/aiProvider');
const { detectRisk, SYSTEM_PROMPT, riskRecipient } = require('../services/chatSafety');
const complaintController = require('./complaintController');
const pendingUsers = new Set();

const aiChatController = {
  sendMessage: async (req, res) => {
    const userId = req.user.id;
    if (req.user.role !== 'user') return res.status(403).json({ message: 'AI chat สำหรับผู้รับบริการเท่านั้น' });
    const text = req.body.message;
    if (typeof text !== 'string' || !text.trim() || text.length > 5000) {
      return res.status(400).json({ message: 'กรุณาพิมพ์ข้อความไม่เกิน 5,000 ตัวอักษร' });
    }
    if (pendingUsers.has(userId)) return res.status(409).json({ message: 'กำลังรอคำตอบของข้อความก่อนหน้า' });
    pendingUsers.add(userId);
    let userMessage;
    let riskAlert = null;
    try {
      if (req.body.message_id !== undefined) {
        const [rows] = await db.query(
          `SELECT id,role,content,risk_flag,created_at FROM ai_chat_messages
           WHERE id = ? AND user_id = ? AND role = 'user' AND active_flag = 1`,
          [req.body.message_id,userId]
        );
        userMessage = rows[0];
        if (!userMessage || userMessage.content !== text.trim()) {
          return res.status(400).json({ message: 'ไม่พบข้อความที่ต้องการลองส่งอีกครั้ง' });
        }
        const [later] = await db.query(
          'SELECT id FROM ai_chat_messages WHERE user_id = ? AND active_flag = 1 AND id > ? LIMIT 1',
          [userId,userMessage.id]
        );
        if (later.length) return res.status(409).json({ message: 'มีข้อความใหม่แล้ว กรุณาโหลดประวัติล่าสุด' });
      } else {
        const conn = await db.getConnection();
        try {
          await conn.beginTransaction();
          const risk = detectRisk(text);
          const [insert] = await conn.query(
            "INSERT INTO ai_chat_messages(user_id,role,content,risk_flag,created_by,updated_by) VALUES(?,'user',?,?,?,?)",
            [userId,text.trim(),risk ? 1 : 0,userId,userId]
          );
          userMessage = { id: insert.insertId, role: 'user', content: text.trim(), risk_flag: risk ? 1 : 0, created_at: new Date() };
          if (risk) {
            const recipient = await riskRecipient(conn,userId);
            const [alert] = await conn.query(
              `INSERT INTO complaints(sender_id,target_id,type,detail,created_by,updated_by)
               VALUES(?,?,'ai_risk_alert',?,?,?)`, [userId,recipient,text.trim(),userId,userId]
            );
            riskAlert = { id: alert.insertId, status: recipient ? 'queued_for_psychologist' : 'unassigned' };
          }
          await conn.commit();
        } catch (error) {
          await conn.rollback();
          throw error;
        } finally { conn.release(); }
      }
      const [history] = await db.query(
        'SELECT role,content FROM ai_chat_messages WHERE user_id = ? AND active_flag = 1 ORDER BY id DESC LIMIT 20', [userId]
      );
      let assistantText;
      try {
        assistantText = await provider.reply(history.reverse(), SYSTEM_PROMPT);
      } catch (error) {
        console.error('AI provider:', { code: error.code || 'AI_PROVIDER_ERROR', status: error.upstreamStatus });
        return res.status(error.code === 'AI_TIMEOUT' ? 504 : 502).json({
          code: error.code || 'AI_PROVIDER_ERROR',
          message: 'บันทึกข้อความแล้ว แต่ AI ยังตอบกลับไม่ได้ กรุณาลองขอคำตอบอีกครั้ง หรือแชทกับนักจิตวิทยา',
          data: { user_message: userMessage, risk_alert: riskAlert },
        });
      }
      const [insert] = await db.query(
        "INSERT INTO ai_chat_messages(user_id,role,content,created_by,updated_by) VALUES(?,'assistant',?,?,?)",
        [userId,assistantText,userId,userId]
      );
      res.status(201).json({ message: 'ส่งข้อความสำเร็จ', data: {
        user_message: userMessage,
        assistant_message: { id: insert.insertId, role: 'assistant', content: assistantText, created_at: new Date() },
        risk_alert: riskAlert,
      } });
    } catch (error) {
      console.error('AI chat:', error.code || error.name);
      res.status(500).json({ message: 'ส่งข้อความไม่สำเร็จ กรุณาลองใหม่' });
    } finally { pendingUsers.delete(userId); }
  },
  getHistory: async (req,res) => {
    try {
      const [rows] = await db.query(
        'SELECT id,role,content,risk_flag,created_at FROM ai_chat_messages WHERE user_id = ? AND active_flag = 1 ORDER BY id ASC', [req.user.id]
      );
      res.json(rows);
    } catch (error) {
      console.error('AI history:', error.code);
      res.status(500).json({ message: 'โหลดประวัติไม่สำเร็จ กรุณาลองใหม่' });
    }
  },
  // One alert store and one acknowledgement policy, shared with the dashboard.
  getRiskAlerts: complaintController.getMyAiAlerts,
  acknowledgeRiskAlert: complaintController.acknowledgeAiAlert,
};
module.exports = aiChatController;
