-- Migration: rebuild psychologist schedule system as weekly schedules
-- Run against mental_health_db after init.sql, migration_hospital.sql and migration_schedule.sql

CREATE TABLE IF NOT EXISTS `psychologist_schedule_weeks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `psychologist_id` int NOT NULL,
  `week_start` date NOT NULL,
  `week_end` date NOT NULL,
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `psychologist_id` (`psychologist_id`),
  CONSTRAINT `psychologist_schedule_weeks_ibfk_1` FOREIGN KEY (`psychologist_id`) REFERENCES `psychologists` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `psychologist_schedules`
  ADD COLUMN `week_id` int DEFAULT NULL AFTER `psychologist_id`,
  ADD COLUMN `work_date` date DEFAULT NULL AFTER `day_of_week`,
  ADD KEY `week_id` (`week_id`),
  ADD CONSTRAINT `psychologist_schedules_ibfk_2` FOREIGN KEY (`week_id`) REFERENCES `psychologist_schedule_weeks` (`id`);
