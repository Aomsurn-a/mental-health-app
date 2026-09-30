CREATE TABLE IF NOT EXISTS mood_pattern_alerts (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  psychologist_id INT NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acknowledged TINYINT(1) NOT NULL DEFAULT 0,
  active_flag TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  episode_date DATE NOT NULL,
  raw_numbers JSON NOT NULL,
  message_source VARCHAR(20) NOT NULL DEFAULT 'rule',
  UNIQUE KEY uq_mood_pattern_episode (patient_id, psychologist_id, alert_type, episode_date),
  KEY ix_mood_pattern_inbox (psychologist_id, active_flag, acknowledged, triggered_at),
  CONSTRAINT fk_mood_pattern_patient FOREIGN KEY (patient_id) REFERENCES users(id),
  CONSTRAINT fk_mood_pattern_psychologist FOREIGN KEY (psychologist_id) REFERENCES psychologists(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
