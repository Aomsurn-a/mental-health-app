const db=require('../config/db');
const summaries=require('../services/patientHistorySummaryService');
const risks=require('../services/riskBulletService');

// ตรวจนัดหมายร่วมกันและบัญชีจริงก่อนอ่าน cache หรือเรียก AI
async function access(req,res) {
  if(!/^[1-9]\d*$/.test(req.params.patientId)) {res.status(400).json({message:'รหัสผู้รับบริการไม่ถูกต้อง'});return null;}
  const [rows]=await db.query(`SELECT p.id FROM psychologists p JOIN users u ON u.id=p.user_id
    WHERE p.user_id=? AND p.active_flag=? AND u.active_flag=? AND u.status=? AND u.role=?
    AND EXISTS(SELECT 1 FROM appointments a JOIN users patient ON patient.id=a.user_id
      WHERE a.psychologist_id=p.id AND a.user_id=? AND a.active_flag=? AND patient.active_flag=?)`,
  [req.user.id,1,1,'active','psychologist',req.params.patientId,1,1]);
  if(!rows.length) {res.status(403).json({message:'ไม่มีสิทธิ์ดูข้อมูลผู้รับบริการรายนี้'});return null;}
  return rows[0].id;
}
// GET ใช้ cache; POST สรุปใหม่ ความล้มเหลวไม่กระทบแท็บประวัติอื่น
async function sessionSummary(req,res) {
  try {
    if(!await access(req,res)) return;
    const result=await summaries.getSummary(req.params.patientId,req.method==='POST');
    res.status(result.unavailable?503:200).json(result);
  } catch(error) {console.error('Pre-session summary:',error.code||error.name);res.status(500).json({message:'ไม่สามารถสรุปได้ในขณะนี้'});}
}
// รวบรวมจุดเสี่ยงจากบริการหมวด 2 ไม่มี AI call
async function riskBullets(req,res) {
  try {
    const psychologistId=await access(req,res);if(!psychologistId)return;
    res.json(await risks.getBullets(req.params.patientId,psychologistId));
  } catch(error) {console.error('Pre-session risk:',error.code||error.name);res.status(500).json({message:'โหลดจุดที่ควรติดตามไม่สำเร็จ'});}
}
module.exports={sessionSummary,riskBullets};
