-- Migration: psychologist disciplinary reports + hospital transfer-request reports
-- Run against mental_health_db after init.sql, migration_hospital.sql

CREATE TABLE IF NOT EXISTS `psychologist_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `psychologist_id` int NOT NULL,
  `complaint_id` int NOT NULL,
  `summary` text,
  `penalty_type` enum('warning_1','warning_2','suspend_7','suspend_30','permanent_ban') DEFAULT NULL,
  `report_count` int NOT NULL DEFAULT '1',
  `status` enum('pending','confirmed','rejected') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `psychologist_id` (`psychologist_id`),
  KEY `complaint_id` (`complaint_id`),
  CONSTRAINT `psychologist_reports_ibfk_1` FOREIGN KEY (`psychologist_id`) REFERENCES `psychologists` (`id`),
  CONSTRAINT `psychologist_reports_ibfk_2` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hospital_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `complaint_id` int NOT NULL,
  `hospital_id` int NOT NULL,
  `user_id` int NOT NULL,
  `reason` text,
  `pdf_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `complaint_id` (`complaint_id`),
  KEY `hospital_id` (`hospital_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `hospital_reports_ibfk_1` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`),
  CONSTRAINT `hospital_reports_ibfk_2` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `hospital_reports_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- เก็บวันที่จะปลดแบนสำหรับ suspend_7 / suspend_30 (NULL = ไม่ได้ถูกแบน หรือถูกแบนถาวรกรณี status='suspended')
ALTER TABLE `users`
  ADD COLUMN `suspended_until` date DEFAULT NULL AFTER `status`;

-- ชื่อ-นามสกุลจริงตามบัตรประชาชน (กรอกตอนส่งคำร้องขอเปลี่ยนนักจิตวิทยา ใช้พิมพ์ลงเอกสาร PDF)
ALTER TABLE `complaints`
  ADD COLUMN `full_legal_name` varchar(255) DEFAULT NULL AFTER `target_id`;

-- เวลาที่นักจิตวิทยากดรับทราบการแจ้งเตือนใน Dashboard (NULL = ยังไม่เคยอ่าน)
ALTER TABLE `psychologist_reports`
  ADD COLUMN `acknowledged_at` timestamp NULL DEFAULT NULL AFTER `status`;
