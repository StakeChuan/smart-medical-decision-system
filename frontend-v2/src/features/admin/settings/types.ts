import type { UserRole } from "@/types/api";

export interface AdminAccount {
  id: number;
  username: string;
  realName: string | null;
  role: UserRole;
  isActive: boolean;
}

export interface UpdateAdminProfileInput {
  realName: string | null;
}

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export interface SystemHealth {
  serviceStatus: string;
  databaseStatus: string;
}
