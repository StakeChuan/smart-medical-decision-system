USE smart_medical_system;

ALTER TABLE ai_reports
    ADD COLUMN patient_summary TEXT NULL AFTER consultation_id,
    ADD COLUMN key_findings TEXT NULL AFTER patient_summary,
    ADD COLUMN risk_level VARCHAR(20) NULL AFTER key_findings,
    ADD COLUMN urgency_level VARCHAR(20) NULL AFTER risk_level,
    ADD COLUMN follow_up_advice TEXT NULL AFTER urgency_level,
    ADD COLUMN structured_summary TEXT NULL AFTER follow_up_advice;
