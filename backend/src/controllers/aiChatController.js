const db = require('../config/db');

const MAXPLUS_BASE_URL = process.env.MAXPLUS_BASE_URL || 'https://api.maxplus-ai.cc';

const RISK_KEYWORDS = ['อยากตาย', 'ทำร้ายตัวเอง', 'ฆ่าตัวตาย', 'สิ้นหวัง'];

const SYSTEM_PROMPT = `คุณคือผู้ฟังที่ใจดีและเห็นอกเห็นใจ ไม่ใช่นักจิตวิทยาหรือแพทย์
ห้ามแนะนำตัวว่าเป็น AI ด้านโค้ดหรือเทคนิคใดๆ เด็ดขาด
หน้าที่ของคุณคือรับฟังผู้ใช้ที่กำลังมีความเครียดหรือความรู้สึกไม่สบายใจ
ใช้คำพูดอบอุ่น เป็นกันเอง แสดงความเข้าใจและเห็นอกเห็นใจ
ห้ามวินิจฉัยโรคหรือให้คำแนะนำทางการแพทย์
ให้กำลังใจและชวนพูดคุยอย่างเป็นธรรมชาติ เหมือนเพื่อนที่รับฟัง
เมื่อเหมาะสม แนะนำให้ผู้ใช้พูดคุยกับนักจิตวิทยาจริงในระบบเพื่อความช่วยเหลือที่ตรงจุด
ถ้าผู้ใช้แสดงความเสี่ยงทำร้ายตัวเองหรือฆ่าตัวตาย ให้แสดงความห่วงใยทันที
และแนะนำสายด่วนสุขภาพจิต 1323 หรือ 1669`;

const detectRisk = (text) => RISK_KEYWORDS.some((kw) => text.includes(kw));

const aiChatController = {
  // ส่งข้อความหา AI
  sendMessage: async (req, res) => {
    try {
      const user_id = req.user.id;
      const { message: userText } = req.body;

      if (!userText || !userText.trim()) {
        return res.status(400).json({ message: 'กรุณาระบุข้อความ' });
      }

      const riskDetected = detectRisk(userText);

      const [userInsert] = await db.query(
        `INSERT INTO ai_chat_messages (user_id, role, content, risk_flag, created_by, updated_by)
         VALUES (?, 'user', ?, ?, ?, ?)`,
        [user_id, userText, riskDetected ? 1 : 0, user_id, user_id]
      );

      if (riskDetected) {
        await db.query(
          `INSERT INTO complaints (sender_id, target_id, type, detail, created_by, updated_by)
           VALUES (?, NULL, 'ai_risk_alert', ?, ?, ?)`,
          [user_id, `AI risk alert: "${userText}"`, user_id, user_id]
        );
      }

      const [historyRows] = await db.query(
        `SELECT role, content FROM ai_chat_messages
         WHERE user_id = ? AND active_flag = 1
         ORDER BY created_at DESC LIMIT 10`,
        [user_id]
      );
      const historyForApi = historyRows.reverse().map((r) => ({ role: r.role, content: r.content }));

      let assistantText;
      try {
        const response = await fetch(`${MAXPLUS_BASE_URL}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.MAXPLUS_API_KEY}`,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: historyForApi,
          }),
        });

        if (!response.ok) {
          throw new Error(`MaxPlus API error: ${response.status}`);
        }

        const result = await response.json();
        assistantText = result?.content?.[0]?.text;
        if (!assistantText) {
          throw new Error('MaxPlus API returned no content');
        }
      } catch (apiError) {
        console.error('MaxPlus API error:', apiError);
        assistantText = 'ขออภัย ขณะนี้ระบบ AI ไม่สามารถตอบกลับได้ กรุณาลองใหม่อีกครั้ง หรือรอการติดต่อจากนักจิตวิทยา';
      }

      const [assistantInsert] = await db.query(
        `INSERT INTO ai_chat_messages (user_id, role, content, created_by, updated_by)
         VALUES (?, 'assistant', ?, ?, ?)`,
        [user_id, assistantText, user_id, user_id]
      );

      res.status(201).json({
        message: 'ส่งข้อความสำเร็จ',
        data: {
          user_message: {
            id: userInsert.insertId,
            role: 'user',
            content: userText,
            risk_flag: riskDetected ? 1 : 0,
            created_at: new Date(),
          },
          assistant_message: {
            id: assistantInsert.insertId,
            role: 'assistant',
            content: assistantText,
            created_at: new Date(),
          },
        },
      });
    } catch (error) {
      console.error('AiChat sendMessage error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงประวัติแชท AI ของตัวเอง
  getHistory: async (req, res) => {
    try {
      const user_id = req.user.id;
      const [rows] = await db.query(
        `SELECT id, role, content, risk_flag, created_at
         FROM ai_chat_messages
         WHERE user_id = ? AND active_flag = 1
         ORDER BY created_at ASC`,
        [user_id]
      );
      res.json(rows);
    } catch (error) {
      console.error('AiChat getHistory error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // นักจิต: ดึงรายการแจ้งเตือนความเสี่ยงของผู้ป่วยในความดูแล
  getRiskAlerts: async (req, res) => {
    try {
      const psychologist_user_id = req.user.id;
      const [rows] = await db.query(
        `SELECT m.id, m.user_id, u.first_name, u.last_name, m.content, m.created_at
         FROM ai_chat_messages m
         JOIN users u ON u.id = m.user_id
         WHERE m.risk_flag = 1 AND m.acknowledged_at IS NULL AND m.active_flag = 1
         AND m.user_id IN (
           SELECT a.user_id FROM appointments a
           JOIN psychologists p ON a.psychologist_id = p.id
           WHERE p.user_id = ? AND a.active_flag = 1
         )
         ORDER BY m.created_at DESC`,
        [psychologist_user_id]
      );
      res.json(rows);
    } catch (error) {
      console.error('AiChat getRiskAlerts error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // นักจิต: รับทราบการแจ้งเตือนความเสี่ยง
  acknowledgeRiskAlert: async (req, res) => {
    try {
      const psychologist_user_id = req.user.id;
      const { id } = req.params;

      await db.query(
        `UPDATE ai_chat_messages m
         JOIN (
           SELECT a.user_id FROM appointments a
           JOIN psychologists p ON a.psychologist_id = p.id
           WHERE p.user_id = ? AND a.active_flag = 1
         ) patients ON patients.user_id = m.user_id
         SET m.acknowledged_at = NOW()
         WHERE m.id = ?`,
        [psychologist_user_id, id]
      );

      res.json({ message: 'รับทราบการแจ้งเตือนแล้ว' });
    } catch (error) {
      console.error('AiChat acknowledgeRiskAlert error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },
};

module.exports = aiChatController;
