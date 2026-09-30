# Pre-Session Intelligence

เปิดหน้า **ผู้ป่วย → ดูประวัติ** จะเห็นจุดเสี่ยงก่อนการ์ดสรุปก่อนเข้าเซสชัน เหนือแท็บประวัติเดิม ใช้ themePsychologist และ Noto Sans Thai เดิม

## Flow

1. Frontend เรียก risk-bullets และ session-summary แยกกัน จุดเสี่ยงจึงไม่ต้องรอ AI
2. Backend ตรวจ JWT, role, สถานะนักจิต และนัดหมายร่วมกับผู้รับบริการก่อนอ่าน cache/ข้อมูล
3. riskBulletService ใช้ข้อความจาก mood_pattern_alerts ที่ยังไม่รับทราบของนักจิตคนนั้น และ trendCalculationService เพื่อเลือกคะแนนที่แย่ลงหรือ high/critical; ใช้ patternDetectionService สำหรับข้อความสำรอง ไม่มี AI call เพิ่ม
4. patientHistorySummaryService อ่าน cache; ถ้าข้อมูลบันทึกการรักษาและนัดหมายยังตรงกัน คืนสรุปเดิมทันที
5. ถ้าต้องสรุปใหม่ รวมบันทึกการรักษาล่าสุดสูงสุด 10 ครั้ง (เรียงเก่าไปใหม่), คะแนนล่าสุดแต่ละชุด และค่าเฉลี่ย Mood 30 วันจาก trendCalculationService
6. ส่งไป `https://api.maxplus-ai.cc/claude-native/v1/messages` ผ่าน provider เดิมด้วย `claude-sonnet-4-6` ตามคำสั่งผู้ใช้ ไม่เปลี่ยนโมเดลของแชทหรือ Trend Analysis
7. เก็บข้อความ จำนวนบันทึก และเวลาสรุปใน patient_session_summaries; ปุ่มสรุปใหม่ใช้ POST เพื่อข้าม cache

## ขอบเขตข้อมูลและ cache

- ผู้ใช้อนุญาตส่งข้อมูลชุดนี้ไป MaxPlus แล้วในแชท วันที่ 2026-09-30
- ไม่ส่งชื่อ อีเมล เบอร์โทร ข้อมูลบัญชี หรือ mood note; บันทึกการรักษายังเป็นข้อความอ่อนไหวที่ผู้บันทึกเขียน
- patientId ใน API คือ users.id; patient_records เชื่อมผ่าน patients.user_id
- บันทึกครั้งล่าสุดเปรียบเทียบ treatment_date และ id จำกัด 10 รายการ ไม่ใช้จำนวนรายการเพียงอย่างเดียวตัดสิน cache
- fingerprint ตรวจทุกบันทึก/นัดหมาย จึงสร้างใหม่เมื่อเพิ่ม แก้ไข หรือยกเลิกข้อมูล รวมถึงเพิ่มครั้งที่ 11 เป็นต้นไป
- Mood/แบบประเมินที่เปลี่ยนอย่างเดียวไม่เรียก AI ใหม่อัตโนมัติตามสเปก ให้กดสรุปใหม่เมื่อต้องการอัปเดต; จุดเสี่ยงโหลดข้อมูลล่าสุดเสมอ
- รวมคำขอพร้อมกันใน process และล็อกฐานข้อมูลข้าม process ป้องกัน AI call ซ้ำ
- ถ้าแหล่งข้อมูลเปลี่ยนระหว่างรอ AI จะไม่บันทึกสรุปชุดเก่าทับ cache
- AI ล่มคืน 503 พร้อม “ไม่สามารถสรุปได้ในขณะนี้” และเก็บ cache เดิมไว้ หน้าจอยังใช้แท็บประวัติอื่นได้
- ไม่มีข้อมูลเลยไม่เรียก AI และไม่สร้างสรุปสมมติ ไม่มี bullet จะซ่อนส่วนจุดเสี่ยง โดยไม่อ้างว่าไม่มีความเสี่ยง

## API

ใช้ JWT ของนักจิตวิทยาที่มีนัดหมายร่วมกับผู้รับบริการ

- GET `/api/psychologist/patients/:patientId/session-summary`
- POST `/api/psychologist/patients/:patientId/session-summary` — สรุปใหม่
- GET `/api/psychologist/patients/:patientId/risk-bullets`

## Setup และทดสอบ

```bat
cd /d D:\Work\Final_project\mental-health-app\backend
npm run migrate:trend
npm run migrate:pre-session
npm run test:pre-session
node tests/preSession.integration.cjs --live
```

Migration ทั้งสองเพิ่มตารางแบบรันซ้ำได้ ไม่ลบข้อมูลเดิม และได้ใช้กับฐานข้อมูลที่ตั้งค่าไว้แล้ว
รีสตาร์ต backend แล้วเปิดหน้า `/patients` ใน frontend

ข้อมูลตัวอย่างที่จะเห็นผลชัดเจน: ผู้รับบริการที่มี appointment กับนักจิต, patients ที่ผูก users.id, patient_records หลายครั้ง, assessment_results อย่างน้อยสองรอบในชุดเดียวกัน และ mood_tracking หลายวัน หากต้องการ bullet จาก mood ให้มี mood_pattern_alerts ที่ยังไม่รับทราบของนักจิตคนนั้น

ชุด integration สร้างฐานข้อมูล `mental_presession_test_<timestamp>` แยก ใช้ข้อมูลจำลองเท่านั้น และลบฐานทดสอบหลังจบ
เพิ่ม `--browser` เพื่อทดสอบหน้าโปรไฟล์เมื่อมี Vite ที่ `http://127.0.0.1:5188` และกำหนด `PLAYWRIGHT_PATH` ไปยัง Playwright ที่ติดตั้งแล้ว

## ผลตรวจ 2026-09-30

- ผ่าน 10 กลุ่มทดสอบ backend: auth/เจ้าของเคส, reuse bullets ไม่มี AI, context/cache, refresh, concurrent call, invalidation จากนัด/บันทึกใหม่, แก้บันทึก, outage, empty, acknowledged alerts
- ผ่าน browser desktop 1440px/mobile 390px: ส่วนใหม่ไม่ล้น, ข้อมูลอยู่เหนือแท็บ, กด refresh, จำลอง error และ recovery, แท็บเดิมยังเปิดได้
- Sonnet 4.6 จริงตอบสรุปประวัติจำลองผ่าน
- Regression Trend (6 unit + 9 integration groups) และแชทเดิม 15 กลุ่มผ่าน
- Frontend production build ผ่าน มีคำเตือน bundle ใหญ่จาก Vite
- UI ใช้ skill Impeccable ยึดสี ตัวอักษร และ component เดิม ตรวจภาพในเธรดนี้แทน reviewer subagent ซึ่งไม่พร้อมใช้งาน; ไม่แก้ DESIGN.md หรือ tokens ของ role
- ภาพทดสอบ: `.impeccable/review/pre-session-desktop.png` และ `pre-session-mobile.png`

ผล live ยืนยันการเชื่อมต่อและรูปแบบสรุปด้วยข้อมูลจำลอง ไม่ได้ยืนยันความถูกต้องทางคลินิกของทุกข้อความ; นักจิตควรเปิดประวัติประกอบการอ่าน
