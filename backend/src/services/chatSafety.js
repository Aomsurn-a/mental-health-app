// Conservative keyword screening, not a clinical assessment. Keep alerting
// independent from the provider so an outage cannot suppress an alert.
const riskPatterns = [
  /อยากตาย|ฆ่าตัวตาย|ทำร้าย(?:ตัวเอง|ตนเอง)|กรีด(?:แขน|ข้อมือ)|ไม่อยาก(?:มีชีวิต|อยู่แล้ว)|จบชีวิต|สิ้นหวัง/,
  /(?:อยาก|จะ|คิดจะ|กำลังจะ|วางแผน)(?:ฆ่า|แทง|ยิง|ทำร้าย)(?:คน|เขา|เธอ|มัน|แฟน|เพื่อน|แม่|พ่อ|ลูก|ครู|ทุกคน|ใคร)/,
  /ทำร้าย(?:คนอื่น|ผู้อื่น)|ฆ่าคน|ฆ่าเขา|ฆ่ามัน|ยิงคน|แทงคน/,
  /suicid|self[- ]?harm|kill\s+(?:myself|him|her|them|someone|people)|hurt\s+(?:myself|someone|others)/i,
];
function detectRisk(text) {
  const normalized = text.normalize('NFC').replace(/\u0E4D\u0E32/g, '\u0E33').replace(/[\u200B-\u200D\uFEFF]/g, '');
  return riskPatterns.some(pattern => pattern.test(normalized) || pattern.test(normalized.replace(/\s/g, '')));
}

const SYSTEM_PROMPT = `คุณเป็น AI ผู้ช่วยรับฟังเบื้องต้น ไม่ใช่นักจิตวิทยาหรือแพทย์
ตอบภาษาไทยอย่างอบอุ่น กระชับ รับฟังและสะท้อนความรู้สึก ถามคำถามปลายเปิดทีละข้อ
ยอมรับความรู้สึกของผู้ใช้ แต่ไม่เข้าข้างจนเกินไป ไม่ยืนยันข้อกล่าวหาหรือความเชื่อที่ยังไม่มีหลักฐาน
ไม่สนับสนุนการทำร้ายตัวเองหรือผู้อื่น ไม่ให้วิธี อุปกรณ์ หรือรายละเอียดที่นำไปทำร้ายได้
ไม่วินิจฉัยโรค ไม่สั่งยา ไม่อ้างว่าเป็นมนุษย์หรือผู้เชี่ยวชาญ
หากมีความคิดทำร้ายตัวเองหรือผู้อื่น ให้แสดงความห่วงใย ถามว่าขณะนี้ปลอดภัยหรือมีอันตรายเร่งด่วนหรือไม่
ชวนให้อยู่ห่างจากสิ่งที่ใช้ทำร้าย ติดต่อคนที่ไว้ใจหรือนักจิตวิทยา
กรณีอันตรายฉุกเฉินในไทยให้ติดต่อ 1669 หรือ 191 และสายด่วนสุขภาพจิต 1323 เพื่อขอคำปรึกษา
ห้ามอ้างว่าแจ้งนักจิตวิทยาแล้วหรือมีเจ้าหน้าที่กำลังเข้าช่วย ระบบจะแสดงสถานะการแจ้งเตือนแยกเอง
ชวนคุยอย่างเป็นธรรมชาติ ไม่กดดัน ไม่ตัดสิน ไม่ให้คำมั่นว่าจะรักษาความลับโดยไม่มีข้อยกเว้น`;

// Prefer a current care relationship; otherwise route to the psychologist
// in the user's most recent conversation. Never broadcast sensitive text.
async function riskRecipient(conn, userId) {
  const [appointments] = await conn.query(
    `SELECT p.user_id FROM appointments a JOIN psychologists p ON p.id = a.psychologist_id
     JOIN users u ON u.id = p.user_id
     WHERE a.user_id = ? AND a.active_flag = 1 AND p.active_flag = 1
       AND u.active_flag = 1 AND u.status = 'active'
       AND a.status IN ('pending','approved','completed')
     ORDER BY (a.status = 'approved') DESC, a.appointment_date DESC, a.id DESC LIMIT 1`, [userId]
  );
  if (appointments.length) return appointments[0].user_id;
  const [conversations] = await conn.query(
    `SELECT u.id AS user_id FROM chat_messages m JOIN users u
       ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
     JOIN psychologists p ON p.user_id = u.id
     WHERE (m.sender_id = ? OR m.receiver_id = ?) AND m.active_flag = 1
       AND u.role = 'psychologist' AND u.active_flag = 1 AND u.status = 'active' AND p.active_flag = 1
     ORDER BY m.id DESC LIMIT 1`, [userId, userId, userId]
  );
  return conversations[0]?.user_id || null;
}
module.exports = { detectRisk, SYSTEM_PROMPT, riskRecipient };
