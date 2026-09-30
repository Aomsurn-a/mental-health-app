const db=require('../config/db');
const calc=require('./trendCalculationService');
const patterns=require('./patternDetectionService');

// ใช้ alert หมวด 2 และ patternDetectionService.js จัดข้อความสำรอง ไม่มี AI call ใหม่
async function getBullets(patientId,psychologistId) {
  const [alerts]=await db.query(`SELECT id,alert_type,message,raw_numbers FROM mood_pattern_alerts
    WHERE patient_id=? AND psychologist_id=? AND active_flag=? AND acknowledged=? ORDER BY triggered_at DESC,id DESC`,
  [patientId,psychologistId,1,0]);
  const bullets=alerts.map(alert=>({severity:alert.alert_type==='mood_drop'?'high':'medium',
    text:alert.message || patterns.fallbackMessage({...alert,raw_numbers:typeof alert.raw_numbers==='string'?JSON.parse(alert.raw_numbers):alert.raw_numbers}),
    source:'mood_pattern_alerts',id:'alert-'+alert.id}));
  const [rows]=await db.query(`SELECT a.id,a.set_id,a.score,a.risk_level,a.taken_at,s.name AS set_name
    FROM assessment_results a JOIN assessment_sets s ON s.id=a.set_id
    WHERE a.user_id=? AND a.active_flag=? ORDER BY a.taken_at,a.id`,[patientId,1]);
  // เรียกฟังก์ชันเดิมจาก trendCalculationService.js โดยตรง ไม่เรียก HTTP/AI ซ้ำ
  for(const set of calc.assessmentTrend(rows).sets) {
    const severe=['high','critical'].includes(set.latest_risk_level);
    if(!severe && set.direction!=='worsening') continue;
    const level=set.latest_risk_level==='critical'?'รุนแรง':'สูง';
    bullets.push({severity:severe?set.latest_risk_level:'medium',id:'assessment-'+set.set_id,source:'assessment_trend',
      text:`${set.set_name}: ${set.direction==='worsening'?`คะแนนเพิ่มจาก ${set.previous_score} เป็น ${set.latest_score}`:`คะแนนล่าสุด ${set.latest_score}`}${severe?` ระดับความเสี่ยง${level}`:''}`});
  }
  const priority={critical:0,high:1,medium:2};
  return {bullets:bullets.sort((a,b)=>priority[a.severity]-priority[b.severity])};
}
module.exports={getBullets};
