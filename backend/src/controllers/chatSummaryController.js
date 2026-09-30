const service=require('../services/chatSummaryService');
// ตรวจ request และคืนข้อผิดพลาดใน modal ได้ โดยไม่เปิดเผย SQL หรือข้อมูลผู้ป่วยใน log
async function summarize(req,res) {
  if(!/^[1-9]\d*$/.test(req.params.patientId)||!Number.isSafeInteger(Number(req.params.patientId))) return res.status(400).json({message:'รหัสผู้รับบริการไม่ถูกต้อง'});
  try {res.json(await service.summarize(req.user.id,Number(req.params.patientId),req.body));}
  catch(error){
    if(error instanceof service.SummaryError) return res.status(error.status).json({message:error.message});
    console.error('Chat summary:',{code:error.code||error.name});
    res.status(500).json({message:'สรุปแชทไม่สำเร็จ กรุณาลองอีกครั้ง'});
  }
}
module.exports={summarize};
