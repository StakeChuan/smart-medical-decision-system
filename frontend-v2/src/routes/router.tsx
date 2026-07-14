import { lazy, Suspense, type ElementType } from "react";
import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";
import { RouteChunkBoundary } from "@/components/feedback/route-chunk-boundary";
import { RouteLoadingFallback } from "@/components/feedback/route-loading-fallback";
import { AdminAppShell } from "@/components/layout/admin-app-shell";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/features/auth/auth-context";
import { RoleForbiddenPage } from "@/features/auth/role-forbidden-page";

const AdminDashboardPage = lazy(() => import("@/features/admin/admin-dashboard-page").then((module) => ({ default: module.AdminDashboardPage })));
const AdminAiManagementPage = lazy(() => import("@/features/admin/ai/admin-ai-management-page").then((module) => ({ default: module.AdminAiManagementPage })));
const AdminDoctorDetailPage = lazy(() => import("@/features/admin/doctors/admin-doctor-detail-page").then((module) => ({ default: module.AdminDoctorDetailPage })));
const AdminDoctorListPage = lazy(() => import("@/features/admin/doctors/admin-doctor-list-page").then((module) => ({ default: module.AdminDoctorListPage })));
const AdminOperationLogPage = lazy(() => import("@/features/admin/logs/admin-operation-log-page").then((module) => ({ default: module.AdminOperationLogPage })));
const AdminPatientDetailPage = lazy(() => import("@/features/admin/patients/admin-patient-detail-page").then((module) => ({ default: module.AdminPatientDetailPage })));
const AdminPatientListPage = lazy(() => import("@/features/admin/patients/admin-patient-list-page").then((module) => ({ default: module.AdminPatientListPage })));
const AdminSettingsPage = lazy(() => import("@/features/admin/settings/admin-settings-page").then((module) => ({ default: module.AdminSettingsPage })));
const AiCenterPage = lazy(() => import("@/features/ai-center/ai-center-page").then((module) => ({ default: module.AiCenterPage })));
const DashboardPage = lazy(() => import("@/pages/dashboard-page").then((module) => ({ default: module.DashboardPage })));
const DesignSystemPage = lazy(() => import("@/pages/design-system-page").then((module) => ({ default: module.DesignSystemPage })));
const DiagnosisWorkspacePage = lazy(() => import("@/pages/diagnosis-workspace-page").then((module) => ({ default: module.DiagnosisWorkspacePage })));
const LoginPage = lazy(() => import("@/pages/login-page").then((module) => ({ default: module.LoginPage })));
const MessageCenterPage = lazy(() => import("@/features/messages/message-center-page").then((module) => ({ default: module.MessageCenterPage })));
const NewConsultationPage = lazy(() => import("@/features/consultations/new-consultation-page").then((module) => ({ default: module.NewConsultationPage })));
const NewPatientPage = lazy(() => import("@/features/patients/new-patient-page").then((module) => ({ default: module.NewPatientPage })));
const PatientDetailPage = lazy(() => import("@/pages/patient-detail-page").then((module) => ({ default: module.PatientDetailPage })));
const PatientsPage = lazy(() => import("@/pages/patients-page").then((module) => ({ default: module.PatientsPage })));
const ReportPage = lazy(() => import("@/pages/report-page").then((module) => ({ default: module.ReportPage })));

function DoctorGuard() { const { user } = useAuth(); if (!user) return <Navigate to="/login" replace />; if (user.role !== "doctor") return <Navigate to="/admin/dashboard" replace />; return <Outlet />; }
function AdminGuard() { const { user } = useAuth(); if (!user) return <Navigate to="/login" replace />; if (user.role !== "admin") return <RoleForbiddenPage area="admin" />; return <Outlet />; }
function RoleHome() { const { user } = useAuth(); if (!user) return <Navigate to="/login" replace />; return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/doctor/dashboard"} replace />; }
function routeElement(Page: ElementType) { return <RouteChunkBoundary><Suspense fallback={<RouteLoadingFallback />}><Page /></Suspense></RouteChunkBoundary>; }

export const router = createBrowserRouter([
  { path: "/login", element: routeElement(LoginPage) },
  { path: "/design-system", element: routeElement(DesignSystemPage) },
  { element: <AdminGuard />, children: [{ element: <AdminAppShell />, children: [
    { path: "/admin/dashboard", element: routeElement(AdminDashboardPage) },
    { path: "/admin/doctors", element: routeElement(AdminDoctorListPage) },
    { path: "/admin/doctors/:doctorId", element: routeElement(AdminDoctorDetailPage) },
    { path: "/admin/patients", element: routeElement(AdminPatientListPage) },
    { path: "/admin/patients/:patientId", element: routeElement(AdminPatientDetailPage) },
    { path: "/admin/ai", element: routeElement(AdminAiManagementPage) },
    { path: "/admin/logs", element: routeElement(AdminOperationLogPage) },
    { path: "/admin/settings", element: routeElement(AdminSettingsPage) },
  ] }] },
  { element: <DoctorGuard />, children: [{ element: <AppShell />, children: [
    { path: "/doctor/dashboard", element: routeElement(DashboardPage) },
    { path: "/doctor/ai-center", element: routeElement(AiCenterPage) },
    { path: "/doctor/messages", element: routeElement(MessageCenterPage) },
    { path: "/doctor/patients", element: routeElement(PatientsPage) },
    { path: "/doctor/patients/new", element: routeElement(NewPatientPage) },
    { path: "/doctor/patients/:patientId", element: routeElement(PatientDetailPage) },
    { path: "/doctor/consultations/new", element: routeElement(NewConsultationPage) },
    { path: "/doctor/patients/:patientId/consultations/:consultationId/diagnosis", element: routeElement(DiagnosisWorkspacePage) },
    { path: "/doctor/patients/:patientId/consultations/:consultationId/report", element: routeElement(ReportPage) },
  ] }] },
  { path: "*", element: <RoleHome /> },
]);
