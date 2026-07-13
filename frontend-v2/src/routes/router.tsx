import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { AdminAppShell } from "@/components/layout/admin-app-shell";
import { AdminDashboardPage } from "@/features/admin/admin-dashboard-page";
import { AdminDoctorDetailPage } from "@/features/admin/doctors/admin-doctor-detail-page";
import { AdminDoctorListPage } from "@/features/admin/doctors/admin-doctor-list-page";
import { AdminPatientDetailPage } from "@/features/admin/patients/admin-patient-detail-page";
import { AdminPatientListPage } from "@/features/admin/patients/admin-patient-list-page";
import { AiCenterPage } from "@/features/ai-center/ai-center-page";
import { useAuth } from "@/features/auth/auth-context";
import { RoleForbiddenPage } from "@/features/auth/role-forbidden-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { DesignSystemPage } from "@/pages/design-system-page";
import { DiagnosisWorkspacePage } from "@/pages/diagnosis-workspace-page";
import { LoginPage } from "@/pages/login-page";
import { NewConsultationPage } from "@/features/consultations/new-consultation-page";
import { NewPatientPage } from "@/features/patients/new-patient-page";
import { MessageCenterPage } from "@/features/messages/message-center-page";
import { PatientDetailPage } from "@/pages/patient-detail-page";
import { PatientsPage } from "@/pages/patients-page";
import { ReportPage } from "@/pages/report-page";

function DoctorGuard() { const { user } = useAuth(); if (!user) return <Navigate to="/login" replace />; if (user.role !== "doctor") return <Navigate to="/admin/dashboard" replace />; return <Outlet />; }
function AdminGuard() { const { user } = useAuth(); if (!user) return <Navigate to="/login" replace />; if (user.role !== "admin") return <RoleForbiddenPage area="admin" />; return <Outlet />; }
function RoleHome() { const { user } = useAuth(); if (!user) return <Navigate to="/login" replace />; return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/doctor/dashboard"} replace />; }

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/design-system", element: <DesignSystemPage /> },
  { element: <AdminGuard />, children: [{ element: <AdminAppShell />, children: [
    { path: "/admin/dashboard", element: <AdminDashboardPage /> },
    { path: "/admin/doctors", element: <AdminDoctorListPage /> },
    { path: "/admin/doctors/:doctorId", element: <AdminDoctorDetailPage /> },
    { path: "/admin/patients", element: <AdminPatientListPage /> },
    { path: "/admin/patients/:patientId", element: <AdminPatientDetailPage /> },
  ] }] },
  { element: <DoctorGuard />, children: [{ element: <AppShell />, children: [
    { path: "/doctor/dashboard", element: <DashboardPage /> },
    { path: "/doctor/ai-center", element: <AiCenterPage /> },
    { path: "/doctor/messages", element: <MessageCenterPage /> },
    { path: "/doctor/patients", element: <PatientsPage /> },
    { path: "/doctor/patients/new", element: <NewPatientPage /> },
    { path: "/doctor/patients/:patientId", element: <PatientDetailPage /> },
    { path: "/doctor/consultations/new", element: <NewConsultationPage /> },
    { path: "/doctor/patients/:patientId/consultations/:consultationId/diagnosis", element: <DiagnosisWorkspacePage /> },
    { path: "/doctor/patients/:patientId/consultations/:consultationId/report", element: <ReportPage /> },
  ] }] },
  { path: "*", element: <RoleHome /> },
]);
