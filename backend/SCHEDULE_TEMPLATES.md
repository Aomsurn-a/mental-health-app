# ตารางงานประจำ (Recurring Schedule Template)

ตั้งค่าผ่านเมนู **ตารางงานประจำ** (`/schedule-template`) ของ role psychologist เท่านั้น
ใช้ธีมและฟอนต์เดิม ไม่มี AI หรือการส่งข้อมูลไป MaxPlus

## ติดตั้ง / เปิดใช้งาน

```powershell
cd D:\Work\Final_project\mental-health-app\backend
npm run migrate:schedule-templates
npm run dev
```

Migration เพิ่มเฉพาะ `schedule_templates` และรันซ้ำได้ ไม่เปลี่ยนข้อมูลตารางรายสัปดาห์
เครื่องพัฒนานี้รัน migration แล้ว; เครื่องอื่นต้องรันเองก่อนเริ่ม backend
node-cron มีอยู่ใน dependencies แล้ว ไม่ต้องเพิ่ม package ใหม่
Restart backend ที่เปิดค้างไว้เพื่อโหลด route/job ใหม่

## Flow

1. นักจิตเพิ่มตารางงานประจำได้หลายช่วง/หลายวัน: วัน เวลาเริ่ม เวลาจบ จำนวนรับต่อชั่วโมง (หน่วยเดียวกับระบบเดิม) หลังบันทึกบนหน้าเว็บ ระบบเรียกสร้างสัปดาห์นี้และสัปดาห์ถัดไปโดยอัตโนมัติ
2. ตรวจ role และหา psychologist_id จาก JWT user id เสมอ ไม่เชื่อ id ที่ client ส่งมา
3. ตรวจวัน 0–6, เวลาในวันเดียวกันและเริ่มก่อนจบ, จำนวนเต็มบวก และช่วงเวลาไม่ซ้อนตารางงานประจำที่ active ในวันเดียวกัน (ช่วงติดกันได้)
4. ทุกวันอาทิตย์ 00:00 `Asia/Bangkok` job สร้างสัปดาห์ **จันทร์ถัดไป** และ **จันทร์ถัดจากนั้นอีก 7 วัน**
5. แต่ละสัปดาห์ใช้ transaction และล็อกแถวนักจิต ก่อนตรวจว่ามี week_start นี้หรือไม่
6. **ถ้ามีสัปดาห์ที่ active อยู่แล้วข้ามทั้งสัปดาห์** ไม่เขียนทับ ส่วนสัปดาห์ที่ถูก soft delete สามารถสร้างใหม่ได้ โดยสร้างแถวใหม่และคงประวัติที่ลบไว้
7. ถ้าไม่มีและมีตารางงานประจำ → สร้าง week แล้วสร้าง slots พร้อม work_date, week_id, created_by/updated_by; ถ้า insert ล้มเหลว rollback ทั้งชุด
8. ดู/แก้/ลบตารางที่สร้างแล้วจากหน้าตารางงานเดิมได้ตามปกติ การเพิ่ม/แก้ช่วงเวลาประจำไม่เพิ่มหรือเปลี่ยน slots ของสัปดาห์ที่มีอยู่แล้ว หากต้องการใช้ชุดล่าสุดใหม่ทั้งสัปดาห์ต้องลบสัปดาห์เดิมก่อนแล้วจึงกดสร้างจากตารางงานประจำ

ปุ่ม **แก้ไขตาราง 2 สัปดาห์นี้จากตารางงานประจำ** เป็นการทำงานแยกจาก auto-fill และ cron: ใช้ transaction ครอบคลุมสองสัปดาห์, ปรับช่วงที่ยังไม่มีนัดให้ตรงกับตารางงานประจำล่าสุด, เก็บช่วงเดิมทั้งช่วงและจำนวนรับไว้เมื่อมีนัด, และตัดช่วงใหม่ตรงส่วนที่ทับกับช่วงนัด ระบบแจ้งวันที่/เวลาและจำนวนช่วงที่คงไว้โดยไม่เปิดเผยตัวผู้ป่วย ถ้าพบ active appointment ที่ไม่ตรงกับช่วงเดิมใดเลย จะหยุดและ rollback ทั้งสองสัปดาห์เพื่อให้นักจิตตรวจสอบก่อน
ถ้าสัปดาห์ถูกลบ ระบบค้นประวัติช่วงเวลาเพื่อจับคู่นัด แล้วกู้แถวสัปดาห์เดิมพร้อมเปิดเฉพาะช่วงที่มีนัด ช่วงไม่มีนัดจากประวัติยังถูกปิดไว้

สัปดาห์เริ่มจันทร์และจบอาทิตย์ ตาม `isoWeek` เดิม ส่วน day_of_week ยังคง 0=อาทิตย์…6=เสาร์
ตัวอย่าง cron วันที่อาทิตย์ 04/10/2026 สร้างช่วง 05–11/10 และ 12–18/10
ไม่สร้างสัปดาห์ว่างเมื่อไม่มีตารางงานประจำที่ active

## API

ทุก endpoint ต้องมี `Authorization: Bearer <JWT>` และ role `psychologist`

| Method | Path | การทำงาน |
|---|---|---|
| GET | `/api/psychologist/schedule-template` | ดูเฉพาะตารางงานประจำ active ของตัวเอง |
| POST | `/api/psychologist/schedule-template` | เพิ่มช่วงเวลา |
| PUT | `/api/psychologist/schedule-template/:id` | แก้ไขเฉพาะรายการของตัวเอง |
| DELETE | `/api/psychologist/schedule-template/:id` | soft delete |
| POST | `/api/psychologist/schedule-template/generate-now` | สร้างสัปดาห์ที่ยังไม่มีจากวันที่ระบุ |
| POST | `/api/psychologist/schedule-template/apply-current-weeks` | ปุ่มแก้ไข: reconcile สัปดาห์ปัจจุบันและสัปดาห์ถัดไป พร้อมคงนัดเดิม |

POST/PUT body:

```json
{ "day_of_week": 1, "start_time": "09:00", "end_time": "12:00", "max_patients_per_slot": 2 }
```

Generate body: `{ "weekStartDate": "2026-10-05", "weekCount": 2 }` ต้องเป็นวันจันทร์จริง รูปแบบ YYYY-MM-DD
UI ส่งจันทร์ของสัปดาห์ปัจจุบันตามวันที่กรุงเทพฯ และ weekCount=2 โดยอัตโนมัติ
ตอบ `{ results: [...], created: 0..2, skipped: 0..2 }` โดยแต่ละ result มีรูปแบบด้านล่าง
ถ้าสร้างได้บางสัปดาห์แล้วอีกสัปดาห์ล้มเหลว กดซ้ำได้: ระบบข้ามส่วนที่สำเร็จแล้วและเติมเฉพาะส่วนที่ยังไม่มี
หากไม่ส่ง weekCount ยังคงพฤติกรรมหนึ่งสัปดาห์เพื่อรองรับ client เดิม

- สร้างใหม่: HTTP 201 `{ status: "created", week_id, week_start, week_end, slotCount }`
- มีอยู่แล้ว: HTTP 200 `{ status: "skipped", reason: "week_exists", week_id, week_start }`
- ไม่มีตารางงานประจำ: HTTP 200 `{ status: "skipped", reason: "no_templates", week_start }`
- ปุ่มแก้ไขสำเร็จ: `{ status: "applied", created, updated, restored, protectedSlots, weekStarts }`; `protectedSlots` มีวันที่ เวลา และจำนวนการนัดต่อช่วง ไม่มีข้อมูลบัญชีผู้ป่วย
- ข้อมูลผิด 400, ไม่ล็อกอิน 401, role ผิด/ไม่มีนักจิต active 403, รายการไม่ใช่ของตัวเองหรือถูกลบ 404, ช่วงเวลาซ้อน 409

## ทดสอบ cron โดยไม่รอวันอาทิตย์

```powershell
cd D:\Work\Final_project\mental-health-app\backend
npm run schedules:generate -- --dry-run
```

ตรวจสองสัปดาห์ถัดไปจากวันที่รัน แสดง `would_create`/`skipped` โดย **ไม่เขียนตารางงาน**
หากต้องการสร้างจริงให้นักจิตทุกคนที่มีตารางงานประจำ:

```powershell
npm run schedules:generate
```

รันอีกรอบต้องได้ `created: 0` และ `skipped` สำหรับสัปดาห์เดิม ตรวจรายละเอียดได้จากหน้าตารางงาน
ปุ่ม **แก้ไขตาราง 2 สัปดาห์นี้จากตารางงานประจำ** เติมเฉพาะสัปดาห์นี้และสัปดาห์ถัดไปของผู้ล็อกอิน
แม้ชื่อปุ่มใช้คำว่าแก้ไข แต่ไม่เขียนทับสัปดาห์ที่ยังมีตารางอยู่ ต่างจาก CLI ที่สร้างสองสัปดาห์ถัดไปของทุกคน
หากบันทึกบนหน้าเว็บสำเร็จแต่ auto-fill ล้มเหลว จะแจ้งแยกกันและให้กดปุ่มนี้ลองใหม่ ไม่ต้องบันทึกช่วงเวลาเดิมซ้ำ
cron ทำงานเฉพาะเมื่อ process backend เปิดอยู่ ไม่ catch-up เวลาที่ปิดเครื่อง; ใช้ CLI เมื่อพลาดรอบ

## Automated tests

```powershell
npm run test:schedule-templates
```

สร้าง schema ชั่วคราว `mental_scheduletemplate_test_<timestamp>` และลบเฉพาะ schema นี้เมื่อเสร็จ ไม่คัดลอกข้อมูลผู้ป่วย
DB user ต้องมีสิทธิ์ CREATE/DROP DATABASE และ TRIGGER สำหรับทดสอบ rollback
ครอบคลุม migration ซ้ำ, auth/role, owner isolation, validation, ช่วงซ้อน/ติดกัน, concurrent create/generate/apply,
การแปลงจันทร์–อาทิตย์, weekly GET/PUT/DELETE เดิม, rollback, ปีใหม่, dry-run, cron timezone,
การสร้างใหม่หลัง soft delete, การกู้คืนสัปดาห์ที่ถูกลบพร้อมนัด, การเติมเฉพาะสัปดาห์ที่หายไป,
แยกช่วงตารางรอบนัดและคงจำนวนรับ, rollback คู่สัปดาห์, orphan appointment และไม่มีตารางงานประจำไม่สร้างข้อมูล

UI tests ใช้ Playwright ที่ติดตั้งภายนอกโปรเจกต์ และ Vite ที่เปิดไว้:

```powershell
# อีก terminal: cd ..\frontend; npm run dev -- --host 127.0.0.1 --port 5188
$env:TEST_UI_URL='http://127.0.0.1:5188'
$env:PLAYWRIGHT_PATH='C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
node tests/scheduleTemplate.integration.cjs --browser
```

ทดสอบสร้าง/แก้/ลบ/Generate และ auto-fill สองสัปดาห์หลังบันทึกผ่าน UI พร้อมตรวจ overflow ที่ 1440px และ 390px
เก็บภาพข้อมูลจำลองใน `.impeccable/review/schedule-template-desktop.png` และ `schedule-template-mobile.png`

## ขอบเขตการป้องกัน concurrent requests

การ generate จาก cron และ generate-now รวมถึงการแก้ตารางงานประจำใช้ lock เดียวกันต่อเจ้าของ
ทดสอบ generate พร้อมกัน 3 คำขอแล้วสร้างเพียง 1 สัปดาห์ อีก 2 คำขอข้าม
ไม่ได้แก้ controller/route รายสัปดาห์เดิมตามข้อกำหนด: endpoint สร้างสัปดาห์เดิมเช็คซ้ำก่อน transaction
และฐานข้อมูลเดิมไม่มี unique key `(psychologist_id, week_start)` จึงยังมี race เดิมหากสร้างสัปดาห์ด้วยมือ
ตรงจังหวะเดียวกับ generator การรับประกันข้ามทุก writer ต้องเพิ่ม unique constraint หลังตรวจข้อมูลซ้ำเดิม
ซึ่งไม่ได้รวมใน migration เพิ่มตารางครั้งนี้ ส่วน generator ไม่อัปเดตหรือทับสัปดาห์เดิมไม่ว่ากรณีใด

## ตรวจการออกแบบ

คง `DESIGN.md`, Noto Sans Thai, themePsychologist และสีเดิมทั้งหมด
ใช้แนวทาง Impeccable: form inline, error/empty/loading states, touch targets 44px,
เปลี่ยน desktop table เป็นรายการบนมือถือ ไม่บีบคอลัมน์จนล้น
ตรวจภาพแบบ inline แทน reviewer แยก; detector ไม่พบ finding ในไฟล์ UI ใหม่
