CREATE DATABASE IF NOT EXISTS smart_medical_system
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE smart_medical_system;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    real_name VARCHAR(50),
    role VARCHAR(20) NOT NULL DEFAULT 'doctor',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS patients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    gender VARCHAR(10),
    age INT,
    phone VARCHAR(20),
    address VARCHAR(255),
    doctor_id INT,
    medical_history TEXT,
    allergy_history TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_patients_doctor_id (doctor_id),
    CONSTRAINT fk_patients_doctor
        FOREIGN KEY (doctor_id) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consultations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    doctor_id INT,
    chief_complaint TEXT,
    symptoms TEXT,
    present_illness TEXT,
    past_history TEXT,
    examination TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_consultations_patient_id (patient_id),
    INDEX idx_consultations_doctor_id (doctor_id),
    INDEX idx_consultations_created_at (created_at),
    CONSTRAINT fk_consultations_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_consultations_doctor
        FOREIGN KEY (doctor_id) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    consultation_id INT NOT NULL UNIQUE,
    patient_summary TEXT,
    key_findings TEXT,
    risk_level VARCHAR(20),
    urgency_level VARCHAR(20),
    follow_up_advice TEXT,
    structured_summary TEXT,
    possible_diseases TEXT,
    suggested_checks TEXT,
    treatment_advice TEXT,
    risk_warning TEXT,
    full_report TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ai_reports_consultation_id (consultation_id),
    CONSTRAINT fk_ai_reports_consultation
        FOREIGN KEY (consultation_id) REFERENCES consultations(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS message_conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_one_id INT NOT NULL,
    user_two_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_message_conversation_users UNIQUE (user_one_id, user_two_id),
    INDEX idx_message_conversations_user_one (user_one_id),
    INDEX idx_message_conversations_user_two (user_two_id),
    INDEX idx_message_conversations_updated_at (updated_at),
    CONSTRAINT fk_message_conversations_user_one
        FOREIGN KEY (user_one_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_message_conversations_user_two
        FOREIGN KEY (user_two_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content TEXT NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_messages_conversation_id (conversation_id),
    INDEX idx_messages_receiver_read (receiver_id, is_read),
    INDEX idx_messages_created_at (created_at),
    CONSTRAINT fk_messages_conversation
        FOREIGN KEY (conversation_id) REFERENCES message_conversations(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender
        FOREIGN KEY (sender_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_messages_receiver
        FOREIGN KEY (receiver_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS operation_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    username VARCHAR(50),
    role VARCHAR(20),
    action VARCHAR(30) NOT NULL,
    module VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(50),
    detail TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_operation_logs_user_id (user_id),
    INDEX idx_operation_logs_module (module),
    INDEX idx_operation_logs_action (action),
    INDEX idx_operation_logs_created_at (created_at),
    CONSTRAINT fk_operation_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO users (id, username, password, real_name, role, is_active)
VALUES
    (1, 'admin', '228460', '系统管理员', 'admin', 1),
    (2, 'luckyizu', '228460', 'luckyizu医生', 'doctor', 1)
ON DUPLICATE KEY UPDATE
    username = VALUES(username),
    password = VALUES(password),
    real_name = VALUES(real_name),
    role = VALUES(role),
    is_active = VALUES(is_active);
