-- เพศนักจิตใช้สำหรับสุ่มผู้ให้บริการ; ค่าที่ไม่ทราบยังคง NULL จนกว่า Admin จะกรอก
ALTER TABLE psychologists
  ADD COLUMN gender ENUM('male', 'female') NULL AFTER user_id;

-- แยกข้อมูลจากผู้ป่วยออกจาก status_note ซึ่งใช้บันทึกสถานะ/การอนุมัติของนัดหมาย
ALTER TABLE appointments
  ADD COLUMN consultation_topic TEXT NULL AFTER location,
  ADD COLUMN patient_note TEXT NULL AFTER consultation_topic;
