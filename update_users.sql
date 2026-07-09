USE smart_medical_system;

UPDATE users
SET username = 'admin',
    password = '228460',
    real_name = '系统管理员',
    role = 'admin'
WHERE id = 1;

INSERT INTO users (id, username, password, real_name, role)
VALUES (2, 'luckyizu', '228460', 'luckyizu医生', 'doctor')
ON DUPLICATE KEY UPDATE
    username = 'luckyizu',
    password = '228460',
    real_name = 'luckyizu医生',
    role = 'doctor';

SELECT id, username, password, real_name, role, created_at
FROM users
ORDER BY id;
