-- Migration: AI Chat feature
-- ai_chat_messages: stores conversation between a user and the AI assistant
-- complaints: add 'ai_risk_alert' type so risk detections can be logged for admin visibility

CREATE TABLE `ai_chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `role` enum('user','assistant') NOT NULL,
  `content` text NOT NULL,
  `risk_flag` tinyint(1) NOT NULL DEFAULT '0',
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `ai_chat_messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `complaints`
  MODIFY COLUMN `type` enum('change_psychologist','report_system','report_psychologist','ai_risk_alert','other') NOT NULL;
