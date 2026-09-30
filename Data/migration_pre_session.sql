CREATE TABLE IF NOT EXISTS patient_session_summaries (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  summary_text TEXT NOT NULL,
  based_on_records_count INT NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  active_flag TINYINT(1) NOT NULL DEFAULT 1,
  source_fingerprint CHAR(64) NOT NULL,
  UNIQUE KEY uq_session_summary_patient (patient_id),
  CONSTRAINT fk_session_summary_patient FOREIGN KEY (patient_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
