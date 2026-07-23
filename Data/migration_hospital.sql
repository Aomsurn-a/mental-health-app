-- Migration: add hospitals table and link psychologists to hospitals
-- Run against mental_health_db after init.sql

-- 1. Create hospitals table
CREATE TABLE IF NOT EXISTS `hospitals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `address` text,
  `phone` varchar(20) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Add hospital_id to psychologists (FK -> hospitals.id) and drop hospital_clinic
ALTER TABLE `psychologists`
  ADD COLUMN `hospital_id` int DEFAULT NULL AFTER `user_id`;

ALTER TABLE `psychologists`
  ADD CONSTRAINT `psychologists_ibfk_hospital`
  FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`);

ALTER TABLE `psychologists`
  DROP COLUMN `hospital_clinic`;

-- 3. Sample data
INSERT INTO `hospitals` (`name`, `address`, `phone`, `status`, `created_by`, `updated_by`)
VALUES
  ('โรงพยาบาล A', 'ที่อยู่โรงพยาบาล A', '02-111-1111', 'active', 1, 1),
  ('โรงพยาบาล B', 'ที่อยู่โรงพยาบาล B', '02-222-2222', 'active', 1, 1);

-- ผูก psy001 กับโรงพยาบาล A, psy002 กับโรงพยาบาล B
UPDATE `psychologists` p
JOIN `users` u ON p.user_id = u.id
SET p.hospital_id = (SELECT id FROM `hospitals` WHERE name = 'โรงพยาบาล A')
WHERE u.username = 'psy001';

UPDATE `psychologists` p
JOIN `users` u ON p.user_id = u.id
SET p.hospital_id = (SELECT id FROM `hospitals` WHERE name = 'โรงพยาบาล B')
WHERE u.username = 'psy002';
