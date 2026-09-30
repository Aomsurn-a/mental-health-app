-- ตารางตั้งต้นเท่านั้น ไม่แก้ไขตารางงานรายสัปดาห์ที่มีอยู่
CREATE TABLE IF NOT EXISTS schedule_templates (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  psychologist_id INT NOT NULL,
  day_of_week TINYINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_patients_per_slot INT NOT NULL DEFAULT 1,
  active_flag TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_schedule_templates_owner (psychologist_id, active_flag, day_of_week),
  CONSTRAINT schedule_templates_psychologist_fk FOREIGN KEY (psychologist_id) REFERENCES psychologists(id),
  CONSTRAINT schedule_templates_day_check CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT schedule_templates_time_check CHECK (start_time >= '00:00:00' AND end_time < '24:00:00' AND start_time < end_time),
  CONSTRAINT schedule_templates_capacity_check CHECK (max_patients_per_slot > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
