# Trend & Risk Analysis Engine

เพิ่ม backend API, SQL migration และงานรายวันตามข้อกำหนด ไม่มีหน้า React ใหม่ในงานนี้

## Flow สำหรับอธิบายตอน defense

1. นักจิตวิทยาส่ง JWT ไปยัง API ระบบตรวจ role, สถานะบัญชี และนัดหมาย approved/completed ของผู้รับบริการรายนั้นก่อนอ่านข้อมูล
2. `trendCalculationService.js` คำนวณตัวเลขด้วย JavaScript จากข้อมูลที่ SQL คัดเลือกแล้ว ไม่เรียก AI
3. `aiInterpretationService.js` ส่งเฉพาะ `raw_numbers` ให้ MaxPlus รุ่น `claude-haiku-4-5-20251001`; mood-trend เท่านั้นที่ส่ง note ของช่วงปัจจุบันเพิ่มเติม ไม่มีชื่อ อีเมล หรือข้อมูลบัญชี
4. AI เขียนคำอธิบายไทย ระบบตรวจเลขในคำตอบว่ามีในข้อมูลที่ส่งหรือไม่ ถ้า AI ล่ม/คำตอบไม่ผ่าน คืน `raw_numbers` โดยไม่มี `ai_summary`
5. ทุกวัน 06:00 Asia/Bangkok งาน `patternDetectionJob.js` เรียกกฎตรวจ pattern จากคะแนนและวันปฏิทิน แล้วหา `psychologists.id` จากนัด approved/completed ล่าสุด
6. เมื่อพบ pattern งานส่งเฉพาะประเภท pattern และตัวเลขที่คำนวณแล้วให้ AI เขียนข้อความ ถ้า AI ใช้ไม่ได้ใช้ข้อความจากกฎและบันทึก `message_source=rule` พร้อม `raw_numbers` แทน
7. นักจิตวิทยาอ่าน inbox ของตนและกดรับทราบผ่าน API ไม่มีการส่งแจ้งเตือนให้บุคคลอื่นหรือสร้างแจ้งเตือนเดิมซ้ำหลังรับทราบ

## API

ทุก endpoint ใช้ `Authorization: Bearer <JWT>` และ role psychologist เท่านั้น

| Method | Path | ผลลัพธ์ |
|---|---|---|
| GET | `/api/psychologist/patients/:patientId/assessment-trend` | `{raw_numbers:{sets:[...]}, ai_summary?}` |
| GET | `/api/psychologist/patients/:patientId/mood-trend?days=14` | `{raw_numbers:{...}, ai_summary?}` |
| GET | `/api/psychologist/alerts?acknowledged=false` | array ของแจ้งเตือนเจ้าของ เลือก true เพื่อดูที่รับทราบแล้ว |
| PUT | `/api/psychologist/alerts/:id/acknowledge` | รับทราบเฉพาะรายการของตน กดซ้ำได้ |

`patientId` เป็น `users.id`; ผู้ดูแลระบบและนักจิตที่ไม่มีความสัมพันธ์ approved/completed ไม่มีสิทธิ์อ่านแนวโน้ม

## กฎและขอบเขตตัวเลข

- ประเมิน: เปรียบเทียบสองรอบล่าสุดภายใน set_id เดียวกัน เรียง taken_at แล้ว id; ชุดเดิม 1–4 คะแนนต่ำลงหมายถึง improving ตาม logic เดิม ชุดใหม่ที่ยังไม่กำหนดทิศทางคืน unknown_scale
- ผลต่าง = ล่าสุด − ก่อนหน้า; เปอร์เซ็นต์ = ผลต่าง / ค่าสัมบูรณ์ก่อนหน้า × 100 ถ้าฐานเป็นศูนย์คืน null
- ข้อมูลไม่ครบสองรอบคืน direction=insufficient_data; null ไม่ใช่คะแนนศูนย์
- Mood: days เป็นจำนวนเต็ม 1–90 ค่าเริ่มต้น 14; ช่วงปัจจุบันรวมวันนี้และอีก N−1 วันย้อนหลัง ช่วงก่อนหน้าคือ N วันก่อนช่วงนี้ ไม่ทับกัน
- เฉลี่ยเฉพาะวันที่บันทึก ไม่เติมศูนย์ในวันขาด; ถ้าวันซ้ำใช้ id ล่าสุด เฉลี่ยก่อนปัดเลขแสดงผลสองตำแหน่ง
- `mood_drop`: คะแนน ≤2 ติดต่อกันอย่างน้อย 3 วันปฏิทิน และวันสุดท้ายต้องเป็นวันนี้หรือเมื่อวาน วันขาดตัดความต่อเนื่อง
- `no_record_gap`: จำนวนวันปฏิทินตั้งแต่บันทึกล่าสุด >5 และเคยบันทึกอย่างน้อย 4 วันในช่วง 7 วันสิ้นสุดที่วันบันทึกล่าสุด
- ตรวจผู้ที่เคยบันทึกทั้งหมด ไม่จำกัดว่าต้องมีบันทึกใน 7 วันล่าสุด เพราะจะพลาดผู้ขาดบันทึกยาว
- ผู้ไม่มีนักจิตตามนัดที่เข้าเกณฑ์ถูกนับ unassigned ไม่กระจายข้อมูลให้ทุกคน
- episode_date คือวันเริ่มช่วงคะแนนต่ำหรือวันบันทึกล่าสุดของช่วงขาดบันทึก ใช้ unique key กันซ้ำแม้รับทราบแล้ว หากเหตุการณ์เดิมยาวขึ้นไม่ส่งซ้ำ; เหตุการณ์ใหม่ที่มีวันเริ่มใหม่สร้างแจ้งเตือนได้
- DB named lock ป้องกันงานหลาย process ทำซ้อนกัน; unique key ป้องกันข้อมูลซ้ำอีกชั้น

เพิ่มเฉพาะตาราง `mood_pattern_alerts` พร้อมคอลัมน์ตามสเปก และ `episode_date`, `raw_numbers`, `message_source` เพื่อกันซ้ำและเก็บหลักฐานตัวเลข/แหล่งข้อความ

## คำสั่งทดสอบ/ใช้งานใน CMD

```bat
cd /d D:\Work\Final_project\mental-health-app\backend
npm run migrate:trend
npm run test:trend
npm run patterns:run -- --dry-run
```

`--dry-run` อ่านข้อมูลและตรวจ rule แต่ไม่เรียก AI หรือสร้าง alert

รันงานจริงทันทีโดยไม่รอเวลา (ส่งเฉพาะตัวเลขของ pattern ไป MaxPlus และสร้าง alert จริง):

```bat
npm run patterns:run
```

เริ่ม backend ใหม่ด้วย `npm run dev` หรือ `npm start` เพื่อลงทะเบียนงาน 06:00 ต้องเปิด process ไว้ในเวลานั้น งานที่พลาดขณะปิดเครื่องไม่ย้อนหลังอัตโนมัติ ให้ใช้คำสั่ง manual

ทดสอบ MaxPlus จริงด้วยข้อมูลจำลอง:

```bat
node tests/trend.integration.cjs --live
```

ชุด integration สร้างฐานข้อมูล `mental_trend_test_<timestamp>` แยก ใช้เฉพาะบัญชีจำลองและลบฐานทดสอบเมื่อจบ ไม่ส่งข้อมูลผู้ใช้จริงระหว่างทดสอบ

## ผลตรวจวันที่ 2026-09-30

- Unit tests 6 รายการผ่าน: แยกชุดคะแนน, ฐานศูนย์, ช่วง mood, วันซ้ำ, timezone, pattern และตัวเลข AI
- Integration ผ่าน: migration ซ้ำได้, auth/role/เจ้าของเคส, endpoint, input validation, raw-only fallback, dry-run, pattern/gap, กันแจ้งซ้ำ, acknowledge และ DB lock
- Regression แชทเดิม 15 รายการผ่านด้วย provider จำลอง
- Migration ในฐานข้อมูลที่ตั้งค่าแล้วสำเร็จ; dry-run สำเร็จ ไม่สร้างแจ้งเตือน
- Live Haiku ยังไม่ผ่าน: MaxPlus HTTP 400 `Requested resource or model is not available.` แม้ `/v1/models` แสดงชื่อโมเดลนี้ ต้องแก้การเข้าถึง channel/model ฝั่ง MaxPlus แล้วรันทดสอบ live ใหม่ ระบบไม่ได้เปลี่ยนไปใช้ Sonnet โดยอัตโนมัติ

ตัวตรวจเลขช่วยปฏิเสธตัวเลขใหม่ แต่ไม่สามารถพิสูจน์ว่าคำอธิบาย AI ถูกต้องทุกประโยค นักจิตต้องดู raw_numbers ประกอบ; กฎติดตามนี้ไม่ใช่การวินิจฉัยทางคลินิก
