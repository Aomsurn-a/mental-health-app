// Synthetic fixtures only. Assessment sources: Data/ST5.pdf and
// Data/202404110957308_แบบคัดกรองประเมิน2Q9Q8Q.pdf (questionnaire page 1).
const assert = require('node:assert/strict');
const { detectPatterns, fallbackMessage } = require('../src/services/patternDetectionService');
const tables = ['users','hospitals','psychologists','patients','assessment_sets',
  'assessment_questions','assessment_results','mood_tracking','psychologist_schedule_weeks',
  'psychologist_schedules','schedule_templates','appointments','patient_records','chat_messages',
  'complaints','psychologist_reports','hospital_reports','mood_pattern_alerts',
  'patient_session_summaries','ai_chat_messages'];
const shift = (day, n) => new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const stamp = (day, time='09:00:00') => day+' '+time;
const options = (labels) => labels.map((label,value)=>({label,value}));
const yn = value => [{label:'ไม่มี',value:0},{label:'มี',value}];
const levels = ['low','medium','high','critical'];
function risk(set, score) {
  const limits = {1:[4,7,9],2:[0,2,2],3:[6,12,18],4:[0,8,16]}[set];
  return levels[limits.findIndex(n=>score<=n) === -1 ? 3 : limits.findIndex(n=>score<=n)];
}
function build({today, userBase, hash}) {
  const data = Object.fromEntries(tables.map(t=>[t,[]]));
  const add = (table, row) => { const r = {id:data[table].length+1,...row}; data[table].push(r); return r; };
  const created = stamp(shift(today,-100));
  const admin = userBase;
  const common = {created_at:created, updated_at:created, created_by:admin};
  function user(username, first, last, role, province, status='active') {
    return add('users',{...common,id:userBase+data.users.length,username,email:username+'@example.com',
      password:hash,first_name:first,last_name:last,role,province,status,active_flag:1,
      suspended_until:status==='suspended'?shift(today,7):null,phone:null});
  }
  user('demo.admin01','ผู้ดูแล','ระบบสาธิต','admin','กรุงเทพมหานคร');
  user('demo.admin02','เจ้าหน้าที่','ระบบสาธิต','admin','ขอนแก่น');
  ['กรุงเทพมหานคร','เชียงใหม่','ขอนแก่น','สงขลา'].forEach((province,i)=>add('hospitals',{
    ...common,name:['ศูนย์สุขภาพใจสายรุ้ง','คลินิกใจอุ่น','ศูนย์ให้คำปรึกษาร่มไม้','คลินิกสมดุลใจ'][i]+' (สมมติ)',
    address:'สถานพยาบาลสมมติสำหรับทดสอบระบบ จังหวัด'+province,phone:null,status:'active'}));
  const psyNames = [['พิมพ์ชนก','ใจเมตตา','female'],['ธนกร','รับฟังดี','male'],['วรัญญา','แสงอุ่น','female'],
    ['กิตติพงศ์','เติมกำลัง','male'],['ณัฐธิดา','อารีใจ','female'],['ปกรณ์','สมดุลสุข','male']];
  const specialties = ['ความเครียดและการปรับตัว','ความวิตกกังวลและการนอน','วัยเรียนและวัยทำงาน',
    'ความสัมพันธ์และครอบครัว','การสูญเสียและการเปลี่ยนผ่านชีวิต','การติดตามอารมณ์และการดูแลต่อเนื่อง'];
  psyNames.forEach(([first,last,gender],i)=>{
    const u=user('demo.psy'+String(i+1).padStart(2,'0'),first,last,'psychologist',['กรุงเทพมหานคร','เชียงใหม่','ขอนแก่น','สงขลา'][i%4]);
    add('psychologists',{...common,user_id:u.id,gender,hospital_id:i%4+1,license_number:'DEMO-NOT-REAL-'+(i+1),
      specialty:specialties[i],experience_years:[4,8,6,12,5,10][i],bio:'ข้อมูลนักจิตวิทยาสมมติสำหรับสาธิตระบบ สนใจด้าน'+specialties[i]});
  });
  const names = ['ณิชา','ธนภัทร','พิมพ์ลภัส','กฤติน','ชลธิชา','ภูริณัฐ','สิริน','อชิระ','วริศรา','ธนวัฒน์',
    'กมลชนก','ปวริศ','มนัสนันท์','ศุภกร','รินรดา','นภัส','ปาริชาติ','ชนาธิป','อริสรา','วรเมธ',
    'นันทิชา','ธีรภัทร','กานต์พิชชา','ภาคิน','สุธิดา','สิรภพ','อัญชิสา','วชิรวิทย์','ลลิตา','อิศรา'];
  const contexts = [
    ['ความกังวลเรื่องสอบและงานกลุ่ม','นักศึกษาที่ต้องจัดการงานหลายวิชาพร้อมกัน','จัดตารางอ่านหนังสือและแบ่งเวลาพัก','จัดลำดับงานได้ชัดเจนขึ้น'],
    ['การนอนหลับไม่ต่อเนื่องจากงานเป็นกะ','พนักงานบริการที่มีเวลาพักผ่อนไม่สม่ำเสมอ','ทบทวนกิจวัตรก่อนนอนและบันทึกเวลาพัก','เริ่มสังเกตปัจจัยที่รบกวนการนอนได้'],
    ['ความเครียดจากรายจ่ายของครอบครัว','ผู้ดูแลครอบครัวที่มีภาระหลายด้าน','แยกเรื่องที่จัดการได้และหาคนช่วยแบ่งภาระ','ยอมรับความช่วยเหลือจากครอบครัวมากขึ้น'],
    ['ความเศร้าจากการสูญเสียคนใกล้ชิด','ผู้รับบริการที่กำลังปรับตัวต่อการเปลี่ยนแปลง','เปิดพื้นที่รับฟังและวางกิจวัตรที่ทำได้ทีละน้อย','พูดถึงความรู้สึกและความต้องการได้มากขึ้น'],
    ['ความกดดันจากการเปลี่ยนงาน','ผู้เริ่มงานใหม่ที่ยังไม่คุ้นกับทีม','ฝึกสื่อสารความต้องการและวางเป้าหมายระยะสั้น','กล้าขอคำแนะนำจากเพื่อนร่วมงานมากขึ้น'],
    ['ความเหนื่อยล้าจากการดูแลผู้สูงอายุ','ผู้ดูแลที่มีเวลาส่วนตัวจำกัด','วางแผนพักและประสานคนในครอบครัว','เริ่มจัดเวลาพักได้แต่ยังต้องติดตาม'],
    ['ความขัดแย้งเรื่องความคาดหวังในครอบครัว','ผู้รับบริการวัยทำงานที่ต้องการขอบเขตส่วนตัว','ฝึกการสื่อสารอย่างสงบและกำหนดขอบเขต','ความขัดแย้งบางเรื่องลดลง'],
    ['ความโดดเดี่ยวหลังย้ายที่อยู่','ผู้รับบริการที่เพิ่งย้ายมาทำงานต่างจังหวัด','วางแผนติดต่อคนใกล้ชิดและทำกิจกรรมที่ชอบ','เริ่มสร้างกิจวัตรและรู้จักคนในชุมชน']];
  const archetypes=['อาการดีขึ้น','ความเครียดเพิ่มขึ้น','อารมณ์คงที่','อารมณ์ผันผวน','ขาดบันทึกช่วงท้าย','ผู้เริ่มใช้ใหม่'];
  for(let i=0;i<30;i++) {
    const u=user('demo.patient'+String(i+1).padStart(2,'0'),names[i],'สาธิต'+String(i+1).padStart(2,'0'),'user',
      ['กรุงเทพมหานคร','เชียงใหม่','ขอนแก่น','สงขลา','นครราชสีมา','ชลบุรี'][i%6],i===28?'inactive':i===29?'suspended':'active');
    const age=[19,23,27,32,38,45,51,60,66,72][i%10];
    add('patients',{...common,user_id:u.id,gender:i%7===0?'other':i%2?'male':'female',
      birth_date:(Number(today.slice(0,4))-age)+'-02-'+String(i%24+1).padStart(2,'0'),blood_type:['A','B','AB','O','unknown'][i%5],
      allergy:i%6===0?'ข้อมูลสมมติ: เคยมีผื่นหลังใช้ยา ให้ตรวจสอบเพิ่มเติม':'ไม่มีประวัติแพ้ที่รายงาน (ข้อมูลสมมติ)'});
  }
  const descriptions=[
    'ประเมินความเครียดในช่วง 2–4 สัปดาห์ที่ผ่านมา คะแนน 0–4 น้อย, 5–7 ปานกลาง, 8–9 มาก, 10–15 มากที่สุด อ้างอิง Data/ST5.pdf',
    'คัดกรองในช่วง 2 สัปดาห์ที่ผ่านมารวมวันนี้ หากมีอย่างน้อยหนึ่งข้อ ให้ประเมินต่อด้วย 9Q และ 8Q ตามเอกสารต้นฉบับ',
    'ประเมินในช่วง 2 สัปดาห์ที่ผ่านมารวมวันนี้ คะแนน 0–6 ไม่มีภาวะซึมเศร้า, 7–12 น้อย, 13–18 ปานกลาง, 19 ขึ้นไป รุนแรง ตามเกณฑ์แบบประเมิน',
    'ข้อ 1–7 ถามช่วง 1 เดือนที่ผ่านมา ข้อ 8 ถามตลอดชีวิต คะแนน 0 ไม่มีแนวโน้ม, 1–8 น้อย, 9–16 ปานกลาง, 17 ขึ้นไป รุนแรง ข้อ 3 รวมคะแนนคำถามต่อเนื่อง (6+8=14 เมื่อควบคุมไม่ได้)'];
  ['แบบประเมินความเครียด (ST-5)','แบบคัดกรองโรคซึมเศร้า (2Q)','แบบประเมินโรคซึมเศร้า (9Q)','แบบประเมินการฆ่าตัวตาย (8Q)'].forEach((name,i)=>add('assessment_sets',{...common,name,description:descriptions[i]}));
  const st=options(['เป็นน้อยมากหรือแทบไม่มี','เป็นบางครั้ง','เป็นบ่อยครั้ง','เป็นประจำ']);
  const nine=options(['ไม่มีเลย','เป็นบางวัน (1–7 วัน)','เป็นบ่อย (มากกว่า 7 วัน)','เป็นทุกวัน']);
  const question=(set, texts, opts)=>texts.forEach((text,i)=>add('assessment_questions',{...common,set_id:set,question:text,
    answer_options:JSON.stringify(typeof opts==='function'?opts(i):opts),order_number:i+1}));
  question(1,['มีปัญหาการนอน นอนไม่หลับหรือนอนมาก','มีสมาธิน้อยลง','หงุดหงิด / กระวนกระวาย / ว้าวุ่นใจ','รู้สึกเบื่อ เซ็ง','ไม่อยากพบปะผู้คน'].map(t=>'ในระยะ 2–4 สัปดาห์ที่ผ่านมา '+t),st);
  question(2,['ท่านรู้สึกหดหู่ เศร้า หรือท้อแท้สิ้นหวังหรือไม่','ท่านรู้สึกเบื่อ ทำอะไรก็ไม่เพลิดเพลินหรือไม่'].map(t=>'ใน 2 สัปดาห์ที่ผ่านมารวมวันนี้ '+t),yn(1));
  question(3,['เบื่อ ไม่สนใจทำอะไร','ไม่สบายใจ ซึมเศร้า ท้อแท้','หลับยากหรือหลับ ๆ ตื่น ๆ หรือหลับมากไป','เหนื่อยง่ายหรือไม่ค่อยมีแรง','เบื่ออาหาร หรือกินมากเกินไป',
    'รู้สึกไม่ดีกับตัวเอง คิดว่าตัวเองล้มเหลว หรือทำให้ตนเองหรือครอบครัวผิดหวัง','สมาธิไม่ดีเวลาทำอะไร เช่น ดูโทรทัศน์ ฟังวิทยุ หรือทำงานที่ต้องใช้ความตั้งใจ',
    'พูดช้า ทำอะไรช้าลง จนคนอื่นสังเกตเห็นได้ หรือกระสับกระส่ายไม่สามารถอยู่นิ่งได้เหมือนที่เคยเป็น','คิดทำร้ายตนเองหรือคิดว่าถ้าตายไปคงจะดี'].map(t=>'ใน 2 สัปดาห์ที่ผ่านมารวมวันนี้ '+t),nine);
  question(4,['ช่วง 1 เดือนที่ผ่านมา คิดอยากตาย หรือคิดว่าตายไปจะดีกว่า','ช่วง 1 เดือนที่ผ่านมา อยากทำร้ายตัวเอง หรือทำให้ตัวเองบาดเจ็บ',
    'ช่วง 1 เดือนที่ผ่านมา คิดเกี่ยวกับการฆ่าตัวตาย (ถ้ามี: ท่านสามารถควบคุมความอยากฆ่าตัวตายที่คิดอยู่นั้นได้หรือไม่ หรือบอกได้ไหมว่าคงจะไม่ทำตามความคิดนั้นในขณะนี้)',
    'ช่วง 1 เดือนที่ผ่านมา มีแผนการที่จะฆ่าตัวตาย','ช่วง 1 เดือนที่ผ่านมา ได้เตรียมการที่จะทำร้ายตนเอง หรือเตรียมการจะฆ่าตัวตาย โดยตั้งใจว่าจะให้ตายจริง ๆ',
    'ช่วง 1 เดือนที่ผ่านมา ได้ทำให้ตนเองบาดเจ็บ แต่ไม่ตั้งใจที่จะทำให้เสียชีวิต','ช่วง 1 เดือนที่ผ่านมา ได้พยายามฆ่าตัวตาย โดยคาดหวัง/ตั้งใจที่จะให้ตาย',
    'ตลอดชีวิตที่ผ่านมา ท่านเคยพยายามฆ่าตัวตาย'],i=>i===2?[{label:'ไม่มีความคิดดังกล่าว',value:0},{label:'มี และควบคุมได้ (6 + 0 คะแนน)',value:6},{label:'มี และควบคุมไม่ได้ (6 + 8 คะแนน)',value:14}]:yn([1,2,6,8,9,4,10,4][i]));
  const stVectors=[[0,1,0,1,0],[1,1,2,1,1],[2,2,2,2,1],[3,2,3,2,2]];
  const qVectors=[[1,0,1,1,0,0,1,0,0],[1,1,2,1,1,1,1,0,0],[2,2,2,2,1,2,2,1,1],[3,3,3,2,2,3,2,2,2]];
  const eVectors=[[0,0,0,0,0,0,0,0],[1,0,0,0,0,0,0,0],[1,2,6,0,0,4,0,0],[1,2,14,8,0,0,0,0]];
  function result(u,set,values,day,time) {
    const qs=data.assessment_questions.filter(q=>q.set_id===set);
    const answers=Object.fromEntries(qs.map((q,i)=>[q.id,values[i]]));
    const score=values.reduce((s,n)=>s+n,0), level=risk(set,score);
    add('assessment_results',{...common,user_id:u,set_id:set,score,risk_level:level,answers:JSON.stringify(answers),
      recommendation:'ผลประเมินสมมติสำหรับทดสอบ ระดับ '+level+' ตามเกณฑ์ในแบบประเมิน ไม่ใช่การวินิจฉัยผู้ป่วยจริง',
      taken_at:stamp(day,time),created_at:stamp(day,time),updated_at:stamp(day,time),created_by:u});
  }
  const monday=shift(today,-((new Date(today+'T12:00:00Z').getUTCDay()+6)%7));
  for(const p of data.psychologists) {
    for(let dow=1;dow<=5;dow++) for(const [start,end] of [['09:00:00','12:00:00'],['13:00:00','16:00:00']])
      add('schedule_templates',{psychologist_id:p.id,day_of_week:dow,start_time:start,end_time:end,max_patients_per_slot:1,created_at:created,updated_at:created});
    for(let w=-9;w<=3;w++) {
      const ws=shift(monday,w*7),week=add('psychologist_schedule_weeks',{...common,psychologist_id:p.id,week_start:ws,week_end:shift(ws,6),created_by:p.user_id});
      for(let d=0;d<5;d++) for(const [start,end] of [['09:00:00','12:00:00'],['13:00:00','16:00:00']])
        add('psychologist_schedules',{...common,psychologist_id:p.id,week_id:week.id,day_of_week:d+1,work_date:shift(ws,d),start_time:start,end_time:end,max_patients_per_slot:1,created_by:p.user_id});
    }
  }
  for(let i=0;i<data.patients.length;i++) {
    const patient=data.patients[i],u=patient.user_id,p=data.psychologists[i%6],ctx=contexts[i%8],kind=i%6;
    const histories=kind===5?[1]:[57,29,15,1];
    histories.forEach((ago,k)=>{
      const severity=kind===0?Math.max(0,3-k):kind===1?Math.min(3,k):kind===2?0:kind===3?[1,3,1,2][k]:kind===4?2:1;
      const date=shift(today,-ago);
      result(u,1,stVectors[severity],date,'08:00:00');
      const positive2Q=severity>0 || i%4===2;
      result(u,2,positive2Q?[1,severity>1?1:0]:[0,0],date,'08:05:00');
      if(positive2Q) { result(u,3,qVectors[severity],date,'08:10:00'); result(u,4,eVectors[severity],date,'08:15:00'); }
    });
    const moodRows=[];
    for(let ago=kind===5?3:59;ago>=1;ago--) {
      if((kind===4 && ago<=8)||(kind===3 && ago%9===0)) continue;
      const score=kind===0?Math.min(5,1+Math.floor((59-ago)/14)):
        kind===1?Math.max(1,5-Math.floor((59-ago)/12)):kind===2?(ago%4===0?5:4):kind===3?[2,4,3,5,2,3,1][ago%7]:kind===4?3:3+(ago%2);
      const day=shift(today,-ago);
      add('mood_tracking',{...common,user_id:u,mood_date:day,mood_score:score,
        answers:JSON.stringify({q1:score>=3,q2:score>=2,q3:score>=4,q4:score>=3,q5:score>=3}),
        note:'ข้อมูลสมมติ: '+['วันนี้รู้สึกหนักใจและพักผ่อนไม่เพียงพอ','มีเรื่องกังวล ต้องการเวลาพัก','ทำกิจวัตรได้ตามปกติ มีบางเรื่องต้องปรับตัว','ได้พูดคุยกับคนใกล้ชิด รู้สึกผ่อนคลาย','พักผ่อนเต็มที่และได้ทำกิจกรรมที่ชอบ'][score-1],
        created_at:stamp(day,'19:00:00'),updated_at:stamp(day,'19:00:00'),created_by:u});
      moodRows.push({mood_date:day,mood_score:score});
    }
    const weekday=Math.floor(i/6); // Five patients per psychologist, one weekday each.
    if(kind!==5) for(let session=0;session<3;session++) {
      const day=shift(monday,-(8-session*2)*7+weekday);
      const a=add('appointments',{...common,user_id:u,psychologist_id:p.id,appointment_date:day,appointment_time:'10:00:00',
        location:data.hospitals[p.hospital_id-1].name,status:'completed',status_note:'เข้ารับคำปรึกษาตามนัด (ข้อมูลสมมติ)',
        consultation_topic:ctx[0],patient_note:'ข้อมูลสมมติ: '+ctx[1],created_at:stamp(shift(day,-7)),updated_at:stamp(day,'11:00:00'),created_by:u});
      add('patient_records',{...common,patient_id:patient.id,psychologist_id:p.id,appointment_id:a.id,session_number:session+1,
        symptoms:'ข้อมูลสมมติ: '+ctx[0],symptom_cause:ctx[1],treatment:'บันทึกสาธิต: '+ctx[2],
        treatment_result:'ข้อมูลสมมติ: '+(kind===1?'ยังมีความกังวลต่อเนื่อง นัดทบทวนปัจจัยกดดันและประเมินซ้ำ':ctx[3]),
        treatment_date:day,created_at:stamp(day,'11:00:00'),updated_at:stamp(day,'11:00:00'),created_by:p.user_id});
    }
    const status=['approved','pending','approved','cancelled','rejected','pending'][kind];
    const future=shift(monday,7+weekday);
    add('appointments',{...common,user_id:u,psychologist_id:p.id,appointment_date:future,appointment_time:'10:00:00',
      location:data.hospitals[p.hospital_id-1].name,status,consultation_topic:ctx[0],patient_note:'ข้อมูลสมมติ: ขอปรึกษาเรื่อง'+ctx[0],
      status_note:status==='cancelled'?'ผู้รับบริการแจ้งติดธุระ (สมมติ)':status==='rejected'?'ขอให้เลือกเวลานัดใหม่ (สมมติ)':null,
      created_at:stamp(shift(today,-2)),updated_at:stamp(shift(today,-1)),created_by:u});
    if(i<12) {
      for(const [j,text] of ['สวัสดีค่ะ/ครับ ขอสอบถามการเตรียมตัวสำหรับนัดครั้งถัดไป','สวัสดีค่ะ/ครับ สามารถนำบันทึกอารมณ์และเรื่องที่อยากปรึกษามาพูดคุยได้','ขอบคุณค่ะ/ครับ จะเตรียมบันทึกไปตามนัด'].entries()) {
        const day=shift(today,-3);
        add('chat_messages',{...common,sender_id:j===1?p.user_id:u,receiver_id:j===1?u:p.user_id,
          message:'[บทสนทนาสมมติระหว่างผู้ใช้กับนักจิตวิทยา] '+text,is_read:j===2?0:1,sent_at:stamp(day,'09:0'+j+':00'),
          created_at:stamp(day,'09:0'+j+':00'),updated_at:stamp(day,'09:0'+j+':00'),created_by:j===1?p.user_id:u});
      }
    }
    if(kind!==5 && i<28) for(const pattern of detectPatterns(moodRows,today)) add('mood_pattern_alerts',{
      patient_id:u,psychologist_id:p.id,...pattern,raw_numbers:JSON.stringify(pattern.raw_numbers),
      message:'[ข้อมูลสมมติ] '+fallbackMessage(pattern),message_source:'rule',acknowledged:i%2,
      triggered_at:stamp(shift(today,-1),'23:00:00'),created_at:stamp(shift(today,-1),'23:00:00')});
  }
  ['report_system','change_psychologist','report_psychologist','other','report_system','report_psychologist','other','change_psychologist'].forEach((type,i)=>{
    const pat=data.patients[i],p=data.psychologists[i%6],status=['pending','in_progress','resolved','rejected'][i%4];
    const complaint=add('complaints',{...common,sender_id:pat.user_id,target_id:['report_psychologist','change_psychologist'].includes(type)?p.user_id:null,
      full_legal_name:names[i]+' สาธิต'+String(i+1).padStart(2,'0'),type,status,
      detail:'ข้อมูลสมมติ: '+({report_system:'ปฏิทินบนโทรศัพท์แสดงผลช้าเมื่อเปลี่ยนเดือน',change_psychologist:'ต้องการผู้ให้คำปรึกษาที่มีเวลานัดตรงกับเวลาว่าง',report_psychologist:'ขอให้ตรวจสอบการแจ้งเลื่อนนัดที่กระชั้นชิด',other:'ขอข้อมูลการติดต่อสถานพยาบาลใกล้บ้าน'}[type]),
      resolved_note:status==='resolved'?'ตรวจสอบและแจ้งผลให้ผู้รับบริการทราบแล้ว (สมมติ)':status==='rejected'?'ข้อมูลไม่เพียงพอ ขอรายละเอียดเพิ่มเติม (สมมติ)':null,
      notify_at:stamp(shift(today,-4)),created_at:stamp(shift(today,-4)),updated_at:stamp(shift(today,-2)),created_by:pat.user_id});
    if(type==='report_psychologist') add('psychologist_reports',{...common,psychologist_id:p.id,complaint_id:complaint.id,
      summary:'รายงานสมมติ: ตรวจสอบกระบวนการแจ้งเลื่อนนัดและทบทวนแนวทางสื่อสาร',penalty_type:i===2?'warning_1':null,
      status:i===2?'confirmed':'pending',report_count:1,created_at:stamp(shift(today,-2)),updated_at:stamp(shift(today,-2))});
  });
  return {data,archetypes};
}
function validate(data) {
  assert.equal(data.ai_chat_messages.length,0);
  assert.equal(data.patient_session_summaries.length,0);
  assert.deepEqual([1,2,3,4].map(id=>data.assessment_questions.filter(q=>q.set_id===id).length),[5,2,9,8]);
  assert.equal(data.assessment_questions.filter(q=>q.set_id===4).reduce((sum,q)=>sum+Math.max(...JSON.parse(q.answer_options).map(o=>o.value)),0),52);
  for(const r of data.assessment_results) {
    const answers=JSON.parse(r.answers),qs=data.assessment_questions.filter(q=>q.set_id===r.set_id);
    assert.equal(Object.keys(answers).length,qs.length);
    for(const q of qs) assert(JSON.parse(q.answer_options).some(o=>o.value===answers[q.id]));
    assert.equal(Object.values(answers).reduce((s,v)=>s+v,0),r.score);
    assert.equal(r.risk_level,risk(r.set_id,r.score));
    if(r.set_id===4) for(const set of [2,3]) assert(data.assessment_results.some(x=>x.user_id===r.user_id&&x.set_id===set&&x.taken_at<r.taken_at));
  }
  const slots=new Set();
  for(const a of data.appointments) {
    assert(data.psychologist_schedules.some(s=>s.psychologist_id===a.psychologist_id&&s.work_date===a.appointment_date&&s.start_time<=a.appointment_time&&s.end_time>a.appointment_time));
    const key=[a.psychologist_id,a.appointment_date,a.appointment_time].join('/');
    assert(!slots.has(key)); slots.add(key);
  }
  for(const r of data.patient_records) {
    const a=data.appointments.find(a=>a.id===r.appointment_id),p=data.patients.find(p=>p.id===r.patient_id);
    assert(a.status==='completed'&&a.user_id===p.user_id&&a.psychologist_id===r.psychologist_id&&a.appointment_date===r.treatment_date);
  }
  assert.equal(new Set(data.mood_tracking.map(r=>r.user_id+'/'+r.mood_date)).size,data.mood_tracking.length);
  return Object.fromEntries(tables.map(t=>[t,data[t].length]));
}
module.exports={build,validate,tables,risk};
