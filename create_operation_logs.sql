USE smart_medical_system;

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
