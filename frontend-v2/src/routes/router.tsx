import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/features/auth/auth-context";
import { DashboardPage } from "@/pages/dashboard-page";
import { DesignSystemPage } from "@/pages/design-system-page";
import { DiagnosisWorkspacePage } from "@/pages/diagnosis-workspace-page";
import { LoginPage } from "@/pages/login-page";
import { PatientDetailPage } from "@/pages/patient-detail-page";
import { ReportPage } from "@/pages/report-page";

function DoctorGuard() { const { user } = useAuth(); if (!user) return <Navigate to="/login" replace />; if (user.role !== "doctor") return <Navigate to="/login" replace />; return <Outlet />; }

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/design-system", element: <DesignSystemPage /> },
  { element: <DoctorGuard />, children: [{ element: <AppShell />, children: [
    { path: "/doctor/dashboard", element: <DashboardPage /> },
    { path: "/doctor/patients/:patientId", element: <PatientDetailPage /> },
    { path: "/doctor/patients/:patientId/consultations/:consultationId/diagnosis", element: <DiagnosisWorkspacePage /> },
    { path: "/doctor/patients/:patientId/consultations/:consultationId/report", element: <ReportPage /> },
  ] }] },
  { path: "*", element: <Navigate to="/doctor/dashboard" replace /> },
]);
