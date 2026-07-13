import type { Doctor } from "@/features/admin/doctors/types";

export function PatientDoctorFilter({ doctors, value, onChange, disabled }: { doctors: Doctor[]; value: number | null; onChange: (value: number | null) => void; disabled?: boolean }) {
  return <label className="admin-patient-doctor-filter"><span>所属医生</span><select value={value ?? ""} disabled={disabled} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}><option value="">全部医生</option>{doctors.map((doctor) => <option value={doctor.id} key={doctor.id}>{doctor.realName || doctor.username}（@{doctor.username}）</option>)}</select></label>;
}
