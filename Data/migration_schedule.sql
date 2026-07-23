-- Migration: add psychologist_schedules table
-- Run against mental_health_db after init.sql (and migration_hospital.sql)

CREATE TABLE IF NOT EXISTS `psychologist_schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `psychologist_id` int NOT NULL,
  `day_of_week` tinyint NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `max_patients_per_slot` int NOT NULL DEFAULT '1',
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `psychologist_id` (`psychologist_id`),
  CONSTRAINT `psychologist_schedules_ibfk_1` FOREIGN KEY (`psychologist_id`) REFERENCES `psychologists` (`id`),
  CONSTRAINT `psychologist_schedules_chk_1` CHECK ((`day_of_week` between 0 and 6))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
