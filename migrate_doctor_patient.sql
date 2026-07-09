USE smart_medical_system;

ALTER TABLE patients
ADD COLUMN doctor_id INT NULL AFTER address;

ALTER TABLE patients
ADD CONSTRAINT fk_patients_doctor
FOREIGN KEY (doctor_id) REFERENCES users(id)
ON DELETE SET NULL;

UPDATE patients p
JOIN (
    SELECT patient_id, MIN(doctor_id) AS doctor_id
    FROM consultations
    WHERE doctor_id IS NOT NULL
    GROUP BY patient_id
) c ON p.id = c.patient_id
SET p.doctor_id = c.doctor_id
WHERE p.doctor_id IS NULL;

SELECT id, name, doctor_id, created_at
FROM patients
ORDER BY id;
