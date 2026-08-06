-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: mental_health_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ai_chat_messages`
--

DROP TABLE IF EXISTS `ai_chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `role` enum('user','assistant') NOT NULL,
  `content` text NOT NULL,
  `risk_flag` tinyint(1) NOT NULL DEFAULT '0',
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `ai_chat_messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_chat_messages`
--

LOCK TABLES `ai_chat_messages` WRITE;
/*!40000 ALTER TABLE `ai_chat_messages` DISABLE KEYS */;
INSERT INTO `ai_chat_messages` VALUES (9,1,'user','สวัสดี',0,1,'2026-07-27 06:34:44',1,1,'2026-07-27 06:34:44'),(10,1,'assistant','สวัสดีครับ/ค่ะ 👋\n\nยินดีที่ได้พบเธอ วันนี้เป็นไงบ้าง มีอะไรที่อยากพูดคุยหรือเป็นห่วงไหม ผมอยู่นี่ฟังอยู่เสมอ',0,1,'2026-07-27 06:34:48',1,1,'2026-07-27 06:34:48'),(11,1,'user','ผมเจอเรื่องเครียดครับช่วงนี้',0,1,'2026-07-27 06:36:04',1,1,'2026-07-27 06:36:04'),(12,1,'assistant','ได้ครับ ขอบคุณที่ไว้ใจพูดคุยกับผม เข้าใจว่าช่วงเนี่ยต้องรู้สึกหนักใจ\n\nลองเล่าให้ฟังหน่อยได้ไหมครับ เรื่องอะไรที่ทำให้เครียด มีอะไรกดดันตรงไหนบ้าง ผมตั้งใจฟังอยู่',0,1,'2026-07-27 06:36:09',1,1,'2026-07-27 06:36:09'),(13,1,'user','ผมคิดว่าผมอยากตาย',1,1,'2026-07-27 06:36:35',1,1,'2026-07-27 06:36:35'),(14,1,'user','ผมคิดว่าผมอยากตาย',1,1,'2026-07-27 06:42:11',1,1,'2026-07-27 06:42:11'),(15,1,'assistant','ฟังผมนะครับ ผมเข้าใจว่าตอนนี้ท่านรู้สึกเจ็บปวดและหดหู่มากจริงๆ แต่ผมอยากให้ท่านได้ความช่วยเหลือจากคนที่เชี่ยวชาญจริงๆ เพราะท่านสมควรได้รับการดูแลที่ดี\n\n**ขอให้ท่านติดต่อสายด่วนสุขภาพจิต ได้เลยตอนนี้:**\n\n📞 **1323** (สายด่วนป้องกันการฆ่าตัวตายกรรมการสาธารณสุข)\n📞 **1669** (สายด่วนสุขภาพจิต สภากาชาดไทย)\n\nหรือไปโรงพยาบาลที่ใกล้ที่สุด ท่านไม่ต้องเผชิญกับเรื่องนี้คนเดียว\n\nท่านมีคนที่เชื่อใจ เพื่อน ครอบครัว หรือผู้ใกล้ชิดไหมครับ ลองบอกพวกเขาบ้าง ให้พวกเขาช่วยดูแล\n\nผมอยากให้ท่านอยู่ครับ จริงๆ เรื่องมีทางแก้ได้ แต่ต้องการความช่วยเหลือจากมืออาชีพ ไปติดต่อสายด่วนเลยนะครับ ไม่ต้องอายหรือกังวลอะไร พวกเขาอยู่ที่นั่นเพื่อช่วยเธอ',0,1,'2026-07-27 06:42:19',1,1,'2026-07-27 06:42:19');
/*!40000 ALTER TABLE `ai_chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appointments`
--

DROP TABLE IF EXISTS `appointments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appointments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `psychologist_id` int NOT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` time NOT NULL,
  `location` varchar(150) DEFAULT NULL,
  `status` enum('pending','approved','rejected','cancelled','completed') NOT NULL DEFAULT 'pending',
  `status_note` text,
  `notify_at` timestamp NULL DEFAULT NULL,
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `psychologist_id` (`psychologist_id`),
  CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`psychologist_id`) REFERENCES `psychologists` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appointments`
--

LOCK TABLES `appointments` WRITE;
/*!40000 ALTER TABLE `appointments` DISABLE KEYS */;
INSERT INTO `appointments` VALUES (1,1,2,'2026-07-20','10:00:00','คลินิกสุขภาพจิตใจดี','completed',NULL,NULL,1,'2026-07-14 11:58:49',1,'2026-07-15 06:56:05',3),(2,2,2,'2026-07-22','16:00:00',NULL,'cancelled',NULL,NULL,1,'2026-07-15 06:12:32',2,'2026-07-15 06:12:36',2),(3,2,1,'2026-07-16','15:30:00',NULL,'pending',NULL,NULL,1,'2026-07-15 06:12:50',2,'2026-07-15 06:12:50',2),(4,1,2,'2026-07-21','03:04:00','a','completed',NULL,NULL,1,'2026-07-16 05:38:06',3,'2026-07-16 05:50:29',3),(5,1,2,'2026-07-21','12:30:53',NULL,'approved',NULL,NULL,1,'2026-07-16 05:50:57',3,'2026-07-16 05:50:57',3),(6,1,1,'2026-07-25','10:30:00',NULL,'pending',NULL,NULL,1,'2026-07-23 05:58:14',1,'2026-07-23 05:58:14',1),(7,1,5,'2026-07-27','16:30:00',NULL,'pending',NULL,NULL,1,'2026-07-23 06:16:57',1,'2026-07-23 06:16:57',1),(13,1,2,'2026-07-24','08:00:00',NULL,'completed',NULL,NULL,1,'2026-07-23 08:29:28',1,'2026-07-23 10:42:54',3),(18,1,2,'2026-07-25','08:00:00',NULL,'approved',NULL,NULL,1,'2026-07-23 11:13:46',3,'2026-07-23 11:13:46',3),(19,1,2,'2026-07-29','08:00:00',NULL,'completed',NULL,NULL,1,'2026-07-25 07:48:25',1,'2026-07-25 07:49:48',3);
/*!40000 ALTER TABLE `appointments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_questions`
--

DROP TABLE IF EXISTS `assessment_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `set_id` int NOT NULL,
  `question` text NOT NULL,
  `answer_options` json DEFAULT NULL,
  `order_number` int DEFAULT '0',
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `set_id` (`set_id`),
  CONSTRAINT `assessment_questions_ibfk_1` FOREIGN KEY (`set_id`) REFERENCES `assessment_sets` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_questions`
--

LOCK TABLES `assessment_questions` WRITE;
/*!40000 ALTER TABLE `assessment_questions` DISABLE KEYS */;
INSERT INTO `assessment_questions` VALUES (1,1,'มีปัญหาการนอน นอนไม่หลับหรือนอนมาก','[{\"label\": \"เป็นน้อยมากหรือแทบไม่มี\", \"value\": 0}, {\"label\": \"เป็นบางครั้ง\", \"value\": 1}, {\"label\": \"เป็นบ่อยครั้ง\", \"value\": 2}, {\"label\": \"เป็นประจำ\", \"value\": 3}]',1,1,'2026-07-13 09:22:27',1,'2026-07-13 09:22:27',NULL),(2,1,'มีสมาธิน้อยลง','[{\"label\": \"เป็นน้อยมากหรือแทบไม่มี\", \"value\": 0}, {\"label\": \"เป็นบางครั้ง\", \"value\": 1}, {\"label\": \"เป็นบ่อยครั้ง\", \"value\": 2}, {\"label\": \"เป็นประจำ\", \"value\": 3}]',2,1,'2026-07-13 09:22:27',1,'2026-07-13 09:22:27',NULL),(3,1,'หงุดหงิด / กระวนกระวาย / ว้าวุ้นใจ','[{\"label\": \"เป็นน้อยมากหรือแทบไม่มี\", \"value\": 0}, {\"label\": \"เป็นบางครั้ง\", \"value\": 1}, {\"label\": \"เป็นบ่อยครั้ง\", \"value\": 2}, {\"label\": \"เป็นประจำ\", \"value\": 3}]',3,1,'2026-07-13 09:22:27',1,'2026-07-13 09:22:27',NULL),(4,1,'รู้สึกเบื่อ เซ็ง','[{\"label\": \"เป็นน้อยมากหรือแทบไม่มี\", \"value\": 0}, {\"label\": \"เป็นบางครั้ง\", \"value\": 1}, {\"label\": \"เป็นบ่อยครั้ง\", \"value\": 2}, {\"label\": \"เป็นประจำ\", \"value\": 3}]',4,1,'2026-07-13 09:22:27',1,'2026-07-13 09:22:27',NULL),(5,1,'ไม่อยากพบปะผู้คน','[{\"label\": \"เป็นน้อยมากหรือแทบไม่มี\", \"value\": 0}, {\"label\": \"เป็นบางครั้ง\", \"value\": 1}, {\"label\": \"เป็นบ่อยครั้ง\", \"value\": 2}, {\"label\": \"เป็นประจำ\", \"value\": 3}]',5,1,'2026-07-13 09:22:27',1,'2026-07-13 09:22:27',NULL),(6,2,'ใน 2 สัปดาห์ที่ผ่านมารวมวันนี้ ท่านรู้สึกหดหู่ เศร้า หรือท้อแท้สิ้นหวังหรือไม่','[{\"label\": \"ไม่มี\", \"value\": 0}, {\"label\": \"มี\", \"value\": 1}]',1,1,'2026-07-13 09:22:54',1,'2026-07-13 09:22:54',NULL),(7,2,'ใน 2 สัปดาห์ที่ผ่านมารวมวันนี้ ท่านรู้สึกเบื่อ ทำอะไรก็ไม่เพลิดเพลินหรือไม่','[{\"label\": \"ไม่มี\", \"value\": 0}, {\"label\": \"มี\", \"value\": 1}]',2,1,'2026-07-13 09:22:54',1,'2026-07-13 09:22:54',NULL),(8,3,'เบื่อ ไม่สนใจทำอะไร','[{\"label\": \"ไม่มีเลย\", \"value\": 0}, {\"label\": \"เป็นบางวัน (1-7 วัน)\", \"value\": 1}, {\"label\": \"เป็นบ่อย (มากกว่า 7 วัน)\", \"value\": 2}, {\"label\": \"เป็นทุกวัน\", \"value\": 3}]',1,1,'2026-07-13 09:23:11',1,'2026-07-13 09:23:11',NULL),(9,3,'ไม่สบายใจ ซึมเศร้า ท้อแท้','[{\"label\": \"ไม่มีเลย\", \"value\": 0}, {\"label\": \"เป็นบางวัน (1-7 วัน)\", \"value\": 1}, {\"label\": \"เป็นบ่อย (มากกว่า 7 วัน)\", \"value\": 2}, {\"label\": \"เป็นทุกวัน\", \"value\": 3}]',2,1,'2026-07-13 09:23:11',1,'2026-07-13 09:23:11',NULL),(10,3,'หลับยากหรือหลับๆ ตื่นๆ หรือหลับมากไป','[{\"label\": \"ไม่มีเลย\", \"value\": 0}, {\"label\": \"เป็นบางวัน (1-7 วัน)\", \"value\": 1}, {\"label\": \"เป็นบ่อย (มากกว่า 7 วัน)\", \"value\": 2}, {\"label\": \"เป็นทุกวัน\", \"value\": 3}]',3,1,'2026-07-13 09:23:11',1,'2026-07-13 09:23:11',NULL),(11,3,'เหนื่อยง่ายหรือไม่ค่อยมีแรง','[{\"label\": \"ไม่มีเลย\", \"value\": 0}, {\"label\": \"เป็นบางวัน (1-7 วัน)\", \"value\": 1}, {\"label\": \"เป็นบ่อย (มากกว่า 7 วัน)\", \"value\": 2}, {\"label\": \"เป็นทุกวัน\", \"value\": 3}]',4,1,'2026-07-13 09:23:11',1,'2026-07-13 09:23:11',NULL),(12,3,'เบื่ออาหาร หรือกินมากเกินไป','[{\"label\": \"ไม่มีเลย\", \"value\": 0}, {\"label\": \"เป็นบางวัน (1-7 วัน)\", \"value\": 1}, {\"label\": \"เป็นบ่อย (มากกว่า 7 วัน)\", \"value\": 2}, {\"label\": \"เป็นทุกวัน\", \"value\": 3}]',5,1,'2026-07-13 09:23:11',1,'2026-07-13 09:23:11',NULL),(13,3,'รู้สึกไม่ดีกับตัวเอง คิดว่าตัวเองล้มเหลว หรือทำให้ตนเองหรือครอบครัวผิดหวัง','[{\"label\": \"ไม่มีเลย\", \"value\": 0}, {\"label\": \"เป็นบางวัน (1-7 วัน)\", \"value\": 1}, {\"label\": \"เป็นบ่อย (มากกว่า 7 วัน)\", \"value\": 2}, {\"label\": \"เป็นทุกวัน\", \"value\": 3}]',6,1,'2026-07-13 09:23:11',1,'2026-07-13 09:23:11',NULL),(14,3,'สมาธิไม่ดีเวลาทำอะไร เช่น ดูโทรทัศน์ ฟังวิทยุ หรือทำงานที่ต้องใช้ความตั้งใจ','[{\"label\": \"ไม่มีเลย\", \"value\": 0}, {\"label\": \"เป็นบางวัน (1-7 วัน)\", \"value\": 1}, {\"label\": \"เป็นบ่อย (มากกว่า 7 วัน)\", \"value\": 2}, {\"label\": \"เป็นทุกวัน\", \"value\": 3}]',7,1,'2026-07-13 09:23:11',1,'2026-07-13 09:23:11',NULL),(15,3,'พูดช้า ทำอะไรช้าลง จนคนอื่นสังเกตเห็นได้ หรือกระสับกระส่ายไม่สามารถอยู่นิ่งได้เหมือนที่เคยเป็น','[{\"label\": \"ไม่มีเลย\", \"value\": 0}, {\"label\": \"เป็นบางวัน (1-7 วัน)\", \"value\": 1}, {\"label\": \"เป็นบ่อย (มากกว่า 7 วัน)\", \"value\": 2}, {\"label\": \"เป็นทุกวัน\", \"value\": 3}]',8,1,'2026-07-13 09:23:11',1,'2026-07-13 09:23:11',NULL),(16,3,'คิดทำร้ายตนเองหรือคิดว่าถ้าตายไปคงจะดี','[{\"label\": \"ไม่มีเลย\", \"value\": 0}, {\"label\": \"เป็นบางวัน (1-7 วัน)\", \"value\": 1}, {\"label\": \"เป็นบ่อย (มากกว่า 7 วัน)\", \"value\": 2}, {\"label\": \"เป็นทุกวัน\", \"value\": 3}]',9,1,'2026-07-13 09:23:11',1,'2026-07-13 09:23:11',NULL),(17,4,'ช่วง 1 เดือนที่ผ่านมา คิดอยากตาย หรือคิดว่าตายไปจะดีกว่า','[{\"label\": \"ไม่มี\", \"value\": 0}, {\"label\": \"มี\", \"value\": 1}]',1,1,'2026-07-13 09:34:45',1,'2026-07-13 09:34:45',NULL),(18,4,'ช่วง 1 เดือนที่ผ่านมา อยากทำร้ายตัวเอง หรือทำให้ตัวเองบาดเจ็บ','[{\"label\": \"ไม่มี\", \"value\": 0}, {\"label\": \"มี\", \"value\": 2}]',2,1,'2026-07-13 09:34:45',1,'2026-07-13 09:34:45',NULL),(19,4,'ช่วง 1 เดือนที่ผ่านมา คิดเกี่ยวกับการฆ่าตัวตาย','[{\"label\": \"ไม่มี\", \"value\": 0}, {\"label\": \"มี แต่ควบคุมได้\", \"value\": 6}, {\"label\": \"มี และควบคุมไม่ได้\", \"value\": 8}]',3,1,'2026-07-13 09:34:45',1,'2026-07-13 09:34:45',NULL),(20,4,'ช่วง 1 เดือนที่ผ่านมา มีแผนการที่จะฆ่าตัวตาย','[{\"label\": \"ไม่มี\", \"value\": 0}, {\"label\": \"มี\", \"value\": 8}]',4,1,'2026-07-13 09:34:45',1,'2026-07-13 09:34:45',NULL),(21,4,'ช่วง 1 เดือนที่ผ่านมา ได้เตรียมการที่จะทำร้ายตนเอง หรือเตรียมการจะฆ่าตัวตายโดยตั้งใจว่าจะให้ตายจริงๆ','[{\"label\": \"ไม่มี\", \"value\": 0}, {\"label\": \"มี\", \"value\": 9}]',5,1,'2026-07-13 09:34:45',1,'2026-07-14 06:55:08',NULL),(22,4,'ช่วง 1 เดือนที่ผ่านมา ได้ทำให้ตนเองบาดเจ็บ แต่ไม่ตังใจที่จะทำให้เสียชีวิต','[{\"label\": \"ไม่มี\", \"value\": 0}, {\"label\": \"มี\", \"value\": 4}]',6,1,'2026-07-13 09:34:45',1,'2026-07-14 06:55:14',NULL),(23,4,'ช่วง 1 เดือนที่ผ่านมา ได้พยายามฆ่าตัวตาย โดยคาดหวัง/ตั้งใจที่จะให้ตาย ','[{\"label\": \"ไม่มี\", \"value\": 0}, {\"label\": \"มี\", \"value\": 10}]',7,1,'2026-07-13 09:34:45',1,'2026-07-14 06:55:19',NULL),(24,4,'ตลอดชีวิตที่ผ่านมา ท่านเคยพยายามฆ่าตัวตาย ','[{\"label\": \"ไม่มี\", \"value\": 0}, {\"label\": \"มี\", \"value\": 4}]',8,1,'2026-07-13 09:34:45',1,'2026-07-14 06:55:59',NULL);
/*!40000 ALTER TABLE `assessment_questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_results`
--

DROP TABLE IF EXISTS `assessment_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `set_id` int NOT NULL,
  `score` int DEFAULT NULL,
  `risk_level` enum('low','medium','high','critical') DEFAULT NULL,
  `answers` json DEFAULT NULL,
  `recommendation` text,
  `taken_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `set_id` (`set_id`),
  CONSTRAINT `assessment_results_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `assessment_results_ibfk_2` FOREIGN KEY (`set_id`) REFERENCES `assessment_sets` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_results`
--

LOCK TABLES `assessment_results` WRITE;
/*!40000 ALTER TABLE `assessment_results` DISABLE KEYS */;
INSERT INTO `assessment_results` VALUES (1,1,1,6,'medium','{\"1\": 2, \"2\": 1, \"3\": 2, \"4\": 1, \"5\": 0}','ความเครียดปานกลาง ควรหาวิธีผ่อนคลายความเครียด เช่น การออกกำลังกาย นั่งสมาธิ หรือทำกิจกรรมที่ชื่นชอบ','2026-07-14 07:40:08',1,'2026-07-14 07:40:08',1,'2026-07-14 07:40:08',NULL),(2,2,1,15,'critical','{\"1\": 3, \"2\": 3, \"3\": 3, \"4\": 3, \"5\": 3}','ความเครียดมากที่สุด ควรพบนักจิตวิทยาหรือจิตแพทย์โดยเร็ว','2026-07-14 07:48:23',1,'2026-07-14 07:48:23',2,'2026-07-14 07:48:23',NULL),(3,2,2,0,'low','{\"6\": 0, \"7\": 0}','ไม่มีอาการซึมเศร้า ดูแลสุขภาพจิตต่อไป','2026-07-14 07:48:42',1,'2026-07-14 07:48:42',2,'2026-07-14 07:48:42',NULL),(4,2,2,2,'medium','{\"6\": 1, \"7\": 1}','มีความเสี่ยงเป็นโรคซึมเศร้า ควรทำแบบประเมิน 9Q เพิ่มเติม','2026-07-14 07:48:56',1,'2026-07-14 07:48:56',2,'2026-07-14 07:48:56',NULL),(5,2,3,9,'medium','{\"8\": 1, \"9\": 1, \"10\": 1, \"11\": 1, \"12\": 1, \"13\": 1, \"14\": 1, \"15\": 1, \"16\": 1}','มีภาวะซึมเศร้าระดับน้อย ควรปรึกษาผู้เชี่ยวชาญและทำแบบประเมิน 8Q เพิ่มเติม','2026-07-14 07:49:38',1,'2026-07-14 07:49:38',2,'2026-07-14 07:49:38',NULL),(6,2,4,0,'low','{\"17\": 0, \"18\": 0, \"19\": 0, \"20\": 0, \"21\": 0, \"22\": 0, \"23\": 0, \"24\": 0}','ไม่มีแนวโน้มจะฆ่าตัวตาย','2026-07-14 07:50:30',1,'2026-07-14 07:50:30',2,'2026-07-14 07:50:30',NULL),(7,1,2,0,'low','{\"6\": 0, \"7\": 0}','ไม่มีอาการซึมเศร้า ดูแลสุขภาพจิตต่อไป','2026-07-20 06:07:07',1,'2026-07-20 06:07:07',1,'2026-07-20 06:07:07',NULL),(8,1,1,9,'high','{\"1\": 2, \"2\": 2, \"3\": 1, \"4\": 2, \"5\": 2}','ความเครียดมาก ควรปรึกษาผู้เชี่ยวชาญด้านสุขภาพจิตเพื่อรับคำแนะนำ','2026-07-23 06:22:39',1,'2026-07-23 06:22:39',1,'2026-07-23 06:22:39',NULL);
/*!40000 ALTER TABLE `assessment_results` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_sets`
--

DROP TABLE IF EXISTS `assessment_sets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_sets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_sets`
--

LOCK TABLES `assessment_sets` WRITE;
/*!40000 ALTER TABLE `assessment_sets` DISABLE KEYS */;
INSERT INTO `assessment_sets` VALUES (1,'ST-5 แบบประเมินความเครียด','แบบประเมินความเครียดด้วยตนเอง ประเมินอาการในช่วง 2-4 สัปดาห์ที่ผ่านมา',1,'2026-07-13 09:22:18',1,'2026-07-13 09:22:18',NULL),(2,'2Q แบบคัดกรองโรคซึมเศร้า','แบบคัดกรองโรคซึมเศร้าเบื้องต้นด้วย 2 คำถาม ประเมินอาการใน 2 สัปดาห์ที่ผ่านมา',1,'2026-07-13 09:22:47',1,'2026-07-13 09:22:47',NULL),(3,'9Q แบบประเมินโรคซึมเศร้า','แบบประเมินโรคซึมเศร้าด้วย 9 คำถาม ประเมินอาการใน 2 สัปดาห์ที่ผ่านมา',1,'2026-07-13 09:23:00',1,'2026-07-13 09:23:00',NULL),(4,'8Q แบบประเมินความเสี่ยงการฆ่าตัวตาย','แบบประเมินความเสี่ยงการฆ่าตัวตาย ประเมินอาการใน 1 เดือนที่ผ่านมา',1,'2026-07-13 09:23:18',1,'2026-07-13 09:23:18',NULL);
/*!40000 ALTER TABLE `assessment_sets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int NOT NULL,
  `receiver_id` int NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sender_id` (`sender_id`),
  KEY `receiver_id` (`receiver_id`),
  CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`),
  CONSTRAINT `chat_messages_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
INSERT INTO `chat_messages` VALUES (1,3,1,'เทสๆๆๆ',1,'2026-07-19 04:12:36',1,'2026-07-19 04:12:36',3,'2026-07-19 04:13:09',3),(2,3,1,'ฮัลโหลๆๆ',1,'2026-07-19 04:12:41',1,'2026-07-19 04:12:41',3,'2026-07-19 04:13:09',3),(3,1,3,'ทดสอบๆ',1,'2026-07-19 04:13:14',1,'2026-07-19 04:13:14',1,'2026-07-19 04:13:59',1),(4,1,3,'12333',1,'2026-07-19 04:13:17',1,'2026-07-19 04:13:17',1,'2026-07-19 04:13:59',1);
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `complaints`
--

DROP TABLE IF EXISTS `complaints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `complaints` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int NOT NULL,
  `target_id` int DEFAULT NULL,
  `full_legal_name` varchar(255) DEFAULT NULL,
  `type` enum('change_psychologist','report_system','report_psychologist','other','ai_risk_alert') NOT NULL,
  `detail` text,
  `status` enum('pending','in_progress','resolved','rejected') NOT NULL DEFAULT 'pending',
  `resolved_note` text,
  `notify_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sender_id` (`sender_id`),
  KEY `target_id` (`target_id`),
  CONSTRAINT `complaints_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`),
  CONSTRAINT `complaints_ibfk_2` FOREIGN KEY (`target_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `complaints`
--

LOCK TABLES `complaints` WRITE;
/*!40000 ALTER TABLE `complaints` DISABLE KEYS */;
INSERT INTO `complaints` VALUES (1,1,NULL,NULL,'report_system','ทดสอบส่งคำร้องระบบ','resolved',NULL,'2026-07-15 06:06:16',1,'2026-07-15 06:06:16',1,'2026-07-18 06:15:40',7),(2,7,NULL,NULL,'change_psychologist','a','resolved',NULL,'2026-07-17 12:03:10',1,'2026-07-17 12:03:10',7,'2026-07-23 09:53:02',7),(3,1,NULL,NULL,'report_system','test','resolved',NULL,'2026-07-19 04:13:29',1,'2026-07-19 04:13:29',1,'2026-07-19 04:14:52',7),(13,1,NULL,NULL,'report_psychologist','AT','resolved',NULL,'2026-07-23 09:49:24',1,'2026-07-23 09:49:24',1,'2026-07-23 09:50:31',7),(14,1,NULL,NULL,'change_psychologist','ไม่ไหวแล้ว','resolved',NULL,'2026-07-23 10:23:31',1,'2026-07-23 10:23:31',1,'2026-07-23 10:25:33',7),(15,1,NULL,NULL,'report_system','ไม่ไหวแล้วววว\n','pending',NULL,'2026-07-23 10:23:41',1,'2026-07-23 10:23:41',1,'2026-07-23 10:50:49',7),(16,1,11,'AAA','change_psychologist','ไม่อ่าววว','resolved',NULL,'2026-07-23 10:45:52',1,'2026-07-23 10:45:52',1,'2026-07-23 10:47:03',7),(17,1,3,NULL,'report_psychologist','aaa','resolved',NULL,'2026-07-23 10:46:17',1,'2026-07-23 10:46:17',1,'2026-07-23 11:04:12',7),(18,1,3,NULL,'report_psychologist','ไม่เอาๆๆๆ','resolved',NULL,'2026-07-23 10:51:31',1,'2026-07-23 10:51:31',1,'2026-07-23 10:52:39',7),(19,1,NULL,NULL,'ai_risk_alert','AI risk alert: \"ผมคิดว่าผมอยากตาย\"','in_progress',NULL,'2026-07-27 06:42:11',1,'2026-07-27 06:42:11',1,'2026-07-27 06:56:55',3);
/*!40000 ALTER TABLE `complaints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hospital_reports`
--

DROP TABLE IF EXISTS `hospital_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hospital_reports` (
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hospital_reports`
--

LOCK TABLES `hospital_reports` WRITE;
/*!40000 ALTER TABLE `hospital_reports` DISABLE KEYS */;
INSERT INTO `hospital_reports` VALUES (1,2,1,7,'at','uploads/reports/hospital_report_1.pdf','2026-07-23 09:53:02',7),(2,14,1,1,'ไม่ไหวแล้ว','uploads/reports/hospital_report_2.pdf','2026-07-23 10:25:33',7),(3,16,1,1,'ไม่อ่าววว','uploads/reports/hospital_report_3.pdf','2026-07-23 10:47:03',7);
/*!40000 ALTER TABLE `hospital_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hospitals`
--

DROP TABLE IF EXISTS `hospitals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hospitals` (
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hospitals`
--

LOCK TABLES `hospitals` WRITE;
/*!40000 ALTER TABLE `hospitals` DISABLE KEYS */;
INSERT INTO `hospitals` VALUES (1,'โรงพยาบาล A','A','02-111-1111','active',1,'2026-07-23 05:42:59',1,'2026-07-23 05:47:04',7),(2,'โรงพยาบาล B','B','02-222-2222','active',1,'2026-07-23 05:42:59',1,'2026-07-23 05:46:56',7),(3,'โรง C',NULL,NULL,'active',0,'2026-07-23 05:50:21',7,'2026-07-23 05:50:31',7);
/*!40000 ALTER TABLE `hospitals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mood_tracking`
--

DROP TABLE IF EXISTS `mood_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mood_tracking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `mood_date` date NOT NULL,
  `mood_score` tinyint DEFAULT NULL,
  `answers` json DEFAULT NULL,
  `note` text,
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_date` (`user_id`,`mood_date`),
  CONSTRAINT `mood_tracking_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `mood_tracking_chk_1` CHECK ((`mood_score` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mood_tracking`
--

LOCK TABLES `mood_tracking` WRITE;
/*!40000 ALTER TABLE `mood_tracking` DISABLE KEYS */;
INSERT INTO `mood_tracking` VALUES (1,2,'2026-07-14',4,'{\"q1\": true, \"q2\": true, \"q3\": true, \"q4\": true, \"q5\": true}','จบิง',1,'2026-07-14 08:01:04',2,'2026-07-14 08:01:04',2),(2,2,'2026-07-13',2,'{\"q1\": false, \"q2\": false, \"q3\": false, \"q4\": false, \"q5\": false}',':(',1,'2026-07-14 08:01:19',2,'2026-07-14 08:01:19',2),(3,1,'2026-07-21',5,'{\"q1\": true, \"q2\": true, \"q3\": true, \"q4\": true, \"q5\": true}','',1,'2026-07-21 09:21:17',1,'2026-07-21 09:21:17',1),(4,1,'2026-07-20',1,'{\"q1\": false, \"q2\": false, \"q3\": false, \"q4\": false, \"q5\": false}','',1,'2026-07-21 09:21:22',1,'2026-07-21 09:21:22',1),(5,1,'2026-07-17',2,'{\"q1\": false, \"q2\": false, \"q3\": false, \"q4\": false, \"q5\": false}','',1,'2026-07-21 09:21:29',1,'2026-07-21 09:21:29',1),(6,1,'2026-07-15',3,'{\"q1\": false, \"q2\": true, \"q3\": false, \"q4\": true, \"q5\": false}','',1,'2026-07-21 09:21:35',1,'2026-07-21 09:21:35',1),(7,1,'2026-07-23',3,'{\"q1\": false, \"q2\": false, \"q3\": false, \"q4\": false, \"q5\": false}','',1,'2026-07-23 04:34:48',1,'2026-07-23 04:34:48',1),(8,1,'2026-07-25',3,'{\"q1\": false, \"q2\": false, \"q3\": false, \"q4\": false, \"q5\": false}','',1,'2026-07-25 07:47:48',1,'2026-07-25 07:47:48',1);
/*!40000 ALTER TABLE `mood_tracking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `patient_records`
--

DROP TABLE IF EXISTS `patient_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `psychologist_id` int NOT NULL,
  `session_number` int DEFAULT '1',
  `symptoms` text,
  `symptom_cause` text,
  `treatment` text,
  `treatment_result` text,
  `treatment_date` date DEFAULT NULL,
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `appointment_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `patient_id` (`patient_id`),
  KEY `psychologist_id` (`psychologist_id`),
  KEY `appointment_id` (`appointment_id`),
  CONSTRAINT `patient_records_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `patient_records_ibfk_2` FOREIGN KEY (`psychologist_id`) REFERENCES `psychologists` (`id`),
  CONSTRAINT `patient_records_ibfk_3` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `patient_records`
--

LOCK TABLES `patient_records` WRITE;
/*!40000 ALTER TABLE `patient_records` DISABLE KEYS */;
INSERT INTO `patient_records` VALUES (6,1,2,1,'a','a','a','a','2026-07-15',1,'2026-07-15 11:26:11',3,'2026-07-15 11:26:11',3,NULL),(7,1,2,2,'a','a','a','a','2026-07-16',1,'2026-07-16 05:23:45',3,'2026-07-16 05:23:45',3,1),(8,1,2,3,'b','a','a','a','2026-07-16',1,'2026-07-16 05:51:02',3,'2026-07-16 10:53:14',3,4);
/*!40000 ALTER TABLE `patient_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `patients`
--

DROP TABLE IF EXISTS `patients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `blood_type` enum('A','B','AB','O','unknown') DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `allergy` text,
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `patients_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `patients`
--

LOCK TABLES `patients` WRITE;
/*!40000 ALTER TABLE `patients` DISABLE KEYS */;
INSERT INTO `patients` VALUES (1,1,NULL,NULL,NULL,NULL,NULL,1,'2026-07-15 11:25:12',1,'2026-07-15 11:25:12',NULL),(2,2,NULL,NULL,NULL,NULL,NULL,1,'2026-07-15 11:25:12',2,'2026-07-15 11:25:12',NULL);
/*!40000 ALTER TABLE `patients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `psychologist_reports`
--

DROP TABLE IF EXISTS `psychologist_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `psychologist_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `psychologist_id` int NOT NULL,
  `complaint_id` int NOT NULL,
  `summary` text,
  `penalty_type` enum('warning_1','warning_2','suspend_7','suspend_30','permanent_ban') DEFAULT NULL,
  `report_count` int NOT NULL DEFAULT '1',
  `status` enum('pending','confirmed','rejected') NOT NULL DEFAULT 'pending',
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `psychologist_id` (`psychologist_id`),
  KEY `complaint_id` (`complaint_id`),
  CONSTRAINT `psychologist_reports_ibfk_1` FOREIGN KEY (`psychologist_id`) REFERENCES `psychologists` (`id`),
  CONSTRAINT `psychologist_reports_ibfk_2` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `psychologist_reports`
--

LOCK TABLES `psychologist_reports` WRITE;
/*!40000 ALTER TABLE `psychologist_reports` DISABLE KEYS */;
INSERT INTO `psychologist_reports` VALUES (1,3,13,'a','warning_1',1,'confirmed',NULL,'2026-07-23 09:50:31',7,'2026-07-23 09:50:46',7),(2,2,18,'aaa','warning_1',1,'confirmed','2026-07-23 11:05:43','2026-07-23 10:52:39',7,'2026-07-23 11:05:43',7),(3,2,17,'aaa','warning_2',2,'confirmed','2026-07-23 11:05:49','2026-07-23 11:04:12',7,'2026-07-23 11:05:49',7);
/*!40000 ALTER TABLE `psychologist_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `psychologist_schedule_weeks`
--

DROP TABLE IF EXISTS `psychologist_schedule_weeks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `psychologist_schedule_weeks` (
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
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `psychologist_schedule_weeks`
--

LOCK TABLES `psychologist_schedule_weeks` WRITE;
/*!40000 ALTER TABLE `psychologist_schedule_weeks` DISABLE KEYS */;
INSERT INTO `psychologist_schedule_weeks` VALUES (1,2,'2026-07-27','2026-08-02',0,'2026-07-23 07:33:46',3,'2026-07-23 07:34:20',3),(2,2,'2026-08-24','2026-08-30',0,'2026-07-23 07:34:15',3,'2026-07-23 07:34:42',3),(3,2,'2026-07-20','2026-07-26',0,'2026-07-23 07:34:37',3,'2026-07-23 07:34:43',3),(4,2,'2026-07-20','2026-07-26',1,'2026-07-23 07:34:52',3,'2026-07-23 07:34:52',3),(5,2,'2026-07-20','2026-07-26',0,'2026-07-23 07:35:39',3,'2026-07-23 07:36:37',3),(6,2,'2026-07-27','2026-08-02',1,'2026-07-23 07:36:01',3,'2026-07-23 07:36:01',3),(8,2,'2026-08-03','2026-08-09',1,'2026-07-23 08:28:36',3,'2026-07-23 08:28:36',3),(9,2,'2026-08-10','2026-08-16',1,'2026-07-25 07:51:17',3,'2026-07-25 07:51:17',3);
/*!40000 ALTER TABLE `psychologist_schedule_weeks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `psychologist_schedules`
--

DROP TABLE IF EXISTS `psychologist_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `psychologist_schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `psychologist_id` int NOT NULL,
  `week_id` int DEFAULT NULL,
  `day_of_week` tinyint NOT NULL,
  `work_date` date DEFAULT NULL,
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
  KEY `week_id` (`week_id`),
  CONSTRAINT `psychologist_schedules_ibfk_1` FOREIGN KEY (`psychologist_id`) REFERENCES `psychologists` (`id`),
  CONSTRAINT `psychologist_schedules_ibfk_2` FOREIGN KEY (`week_id`) REFERENCES `psychologist_schedule_weeks` (`id`),
  CONSTRAINT `psychologist_schedules_chk_1` CHECK ((`day_of_week` between 0 and 6))
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `psychologist_schedules`
--

LOCK TABLES `psychologist_schedules` WRITE;
/*!40000 ALTER TABLE `psychologist_schedules` DISABLE KEYS */;
INSERT INTO `psychologist_schedules` VALUES (1,2,1,1,'2026-07-27','08:00:00','12:00:00',3,0,'2026-07-23 07:33:46',3,'2026-07-23 07:34:05',3),(2,2,1,1,'2026-07-27','13:00:00','16:00:00',1,0,'2026-07-23 07:33:46',3,'2026-07-23 07:34:05',3),(3,2,1,3,'2026-07-29','08:00:00','12:00:00',1,0,'2026-07-23 07:33:46',3,'2026-07-23 07:34:05',3),(4,2,1,5,'2026-07-31','08:00:00','12:00:00',1,0,'2026-07-23 07:33:46',3,'2026-07-23 07:34:05',3),(5,2,1,6,'2026-08-01','08:00:00','12:00:00',1,0,'2026-07-23 07:33:46',3,'2026-07-23 07:34:05',3),(6,2,1,1,'2026-07-27','08:00:00','12:00:00',1,0,'2026-07-23 07:34:05',3,'2026-07-23 07:34:20',3),(7,2,1,6,'2026-08-01','08:00:00','12:00:00',1,0,'2026-07-23 07:34:05',3,'2026-07-23 07:34:20',3),(8,2,2,2,'2026-08-25','08:00:00','12:00:00',1,0,'2026-07-23 07:34:15',3,'2026-07-23 07:34:42',3),(9,2,3,3,'2026-07-22','08:00:00','12:00:00',1,0,'2026-07-23 07:34:37',3,'2026-07-23 07:34:43',3),(10,2,3,0,'2026-07-26','08:00:00','12:00:00',1,0,'2026-07-23 07:34:37',3,'2026-07-23 07:34:43',3),(11,2,4,5,'2026-07-24','08:00:00','12:00:00',1,1,'2026-07-23 07:34:52',3,'2026-07-23 07:34:52',3),(12,2,4,6,'2026-07-25','08:00:00','12:00:00',1,1,'2026-07-23 07:34:52',3,'2026-07-23 07:34:52',3),(13,2,4,0,'2026-07-26','08:00:00','12:00:00',1,1,'2026-07-23 07:34:52',3,'2026-07-23 07:34:52',3),(14,2,5,1,'2026-07-20','08:00:00','12:00:00',1,0,'2026-07-23 07:35:39',3,'2026-07-23 07:36:37',3),(15,2,5,3,'2026-07-22','08:00:00','12:00:00',1,0,'2026-07-23 07:35:39',3,'2026-07-23 07:36:37',3),(16,2,5,4,'2026-07-23','08:00:00','12:00:00',1,0,'2026-07-23 07:35:39',3,'2026-07-23 07:36:37',3),(17,2,6,3,'2026-07-29','08:00:00','12:00:00',1,1,'2026-07-23 07:36:01',3,'2026-07-23 07:36:01',3),(18,2,6,4,'2026-07-30','08:00:00','12:00:00',1,1,'2026-07-23 07:36:01',3,'2026-07-23 07:36:01',3),(19,2,6,5,'2026-07-31','08:00:00','12:00:00',1,1,'2026-07-23 07:36:01',3,'2026-07-23 07:36:01',3),(21,2,8,4,'2026-08-06','08:00:00','12:00:00',1,1,'2026-07-23 08:28:36',3,'2026-07-23 08:28:36',3),(22,2,9,1,'2026-08-10','08:00:00','12:00:00',2,1,'2026-07-25 07:51:17',3,'2026-07-25 07:51:17',3),(23,2,9,1,'2026-08-10','14:25:00','16:05:00',1,1,'2026-07-25 07:51:17',3,'2026-07-25 07:51:17',3),(24,2,9,2,'2026-08-11','08:00:00','12:00:00',1,1,'2026-07-25 07:51:17',3,'2026-07-25 07:51:17',3),(25,2,9,3,'2026-08-12','08:00:00','12:00:00',1,1,'2026-07-25 07:51:17',3,'2026-07-25 07:51:17',3);
/*!40000 ALTER TABLE `psychologist_schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `psychologists`
--

DROP TABLE IF EXISTS `psychologists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `psychologists` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `hospital_id` int DEFAULT NULL,
  `license_number` varchar(50) NOT NULL,
  `specialty` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `experience_years` int DEFAULT '0',
  `bio` text,
  `available_schedule` json DEFAULT NULL,
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `license_number` (`license_number`),
  KEY `psychologists_ibfk_hospital` (`hospital_id`),
  CONSTRAINT `psychologists_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `psychologists_ibfk_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `psychologists`
--

LOCK TABLES `psychologists` WRITE;
/*!40000 ALTER TABLE `psychologists` DISABLE KEYS */;
INSERT INTO `psychologists` VALUES (1,2,1,'PSY-001-2024','โรคซึมเศร้าและความวิตกกังวล','0812345678',5,'ผู้เชี่ยวชาญด้านโรคซึมเศร้าและความวิตกกังวล มีประสบการณ์มากกว่า 5 ปี',NULL,0,'2026-07-14 08:25:19',1,'2026-07-23 06:14:59',7),(2,3,1,'PSY-002-2024','ความเครียดและการปรับตัว','0823456789',8,'เชี่ยวชาญด้านการจัดการความเครียดและการปรับตัวในชีวิต มีประสบการณ์ 8 ปี',NULL,1,'2026-07-14 08:25:19',1,'2026-07-23 05:42:59',NULL),(3,8,2,'123',NULL,NULL,0,NULL,NULL,1,'2026-07-18 06:07:50',7,'2026-07-23 05:56:36',7),(5,4,2,'PSY-003-2024','ความเครียดและการปรับตัว','0823456789',8,'เชี่ยวชาญด้านการจัดการความเครียดและการปรับตัวในชีวิต มีประสบการณ์ 8 ปี',NULL,1,'2026-07-23 06:13:33',1,'2026-07-23 06:13:33',NULL),(7,11,1,'87345353453',NULL,NULL,40,NULL,NULL,1,'2026-07-23 10:45:11',7,'2026-07-25 07:52:45',7);
/*!40000 ALTER TABLE `psychologists` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `role` enum('user','psychologist','admin') NOT NULL DEFAULT 'user',
  `phone` varchar(20) DEFAULT NULL,
  `province` varchar(50) DEFAULT NULL,
  `status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
  `suspended_until` date DEFAULT NULL,
  `active_flag` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'testuser','test@test.com','$2b$10$XuO6cuYe78ujozVVT8fVcep0.EUe6Cs2JnqQX2kxZMqxF2NeZgxk2','ทด','สอบ','user',NULL,NULL,'active',NULL,1,'2026-07-12 10:28:08',1,'2026-07-23 09:46:51',1),(2,'admin','T@gmail.com','$2b$10$iBZYUga0IMa0pMZEMzkeYuH.DjXoqmpZILgz46PvxnLHh72tbVBhm','A','T','user',NULL,NULL,'active',NULL,0,'2026-07-12 10:49:33',1,'2026-07-25 07:52:31',7),(3,'psy001','psy001@test.com','$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','สมชาย','ใจดี','psychologist','0812345678','กรุงเทพมหานคร','active',NULL,1,'2026-07-14 08:25:00',1,'2026-07-23 09:46:36',7),(4,'psy002','psy002@test.com','$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','สมหญิง','รักษาดี','psychologist','0823456789','เชียงใหม่','active',NULL,1,'2026-07-14 08:25:00',1,'2026-07-14 08:25:00',NULL),(7,'sysadmin','admin@mental.com','$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','ผู้ดูแล','ระบบ','admin',NULL,NULL,'active',NULL,1,'2026-07-17 07:28:20',1,'2026-07-23 09:46:51',NULL),(8,'Dr.A','A@gmail.com','$2b$10$gNQrKlgIq0gvrJwd3Jf4TOzlo7f5rS7vZcnMEuG4kfYy4hvm2WMWG','Dr.A','TAA','psychologist',NULL,NULL,'active',NULL,1,'2026-07-18 06:07:50',7,'2026-07-18 06:07:50',7),(11,'สมเด็จ','สมเด็จ@test.com','$2b$10$ZqUrmpZot64E9hGGVkrZfe0t9.M48aKlIJbV8SWRrJ5Q/C0HmT4qS','สมเด็จ','หมูกระทะ','psychologist',NULL,NULL,'active',NULL,1,'2026-07-23 10:45:11',7,'2026-07-23 10:45:11',7);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-06 14:59:44
