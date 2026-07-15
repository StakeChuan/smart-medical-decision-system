USE smart_medical_system;

UPDATE users
SET username = 'admin',
    password = '$2b$12$U8gl03rllHniN6yuJbPyfeVmH7W/QCqLR9SbFfwf6nlI9eDhJ0YIW',
    real_name = '系统管理员',
    role = 'admin'
WHERE id = 1;

INSERT INTO users (id, username, password, real_name, role)
VALUES (2, 'luckyizu', '$2b$12$kUeTKn2qViTIgUY1af0DHuEUKHQF0Jid4FC66LzUjcMun9NnjjP0i', 'luckyizu医生', 'doctor')
ON DUPLICATE KEY UPDATE
    username = 'luckyizu',
    password = '$2b$12$kUeTKn2qViTIgUY1af0DHuEUKHQF0Jid4FC66LzUjcMun9NnjjP0i',
    real_name = 'luckyizu医生',
    role = 'doctor';

SELECT id, username, real_name, role, created_at
FROM users
ORDER BY id;
