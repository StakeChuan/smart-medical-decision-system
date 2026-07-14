import { apiRequest } from "./client";
import type {
  AdminAccount,
  ChangePasswordInput,
  SystemHealth,
  UpdateAdminProfileInput,
} from "@/features/admin/settings/types";

interface UserDto {
  用户ID: number;
  用户名: string;
  真实姓名: string | null;
  角色: "doctor" | "admin";
  是否启用: boolean;
}

interface ProfileUpdateDto {
  真实姓名: string | null;
}

interface PasswordChangeDto {
  原密码: string;
  新密码: string;
}

interface HealthDto {
  status: string;
  database: string;
}

function mapAccount(dto: UserDto): AdminAccount {
  return {
    id: dto.用户ID,
    username: dto.用户名,
    realName: dto.真实姓名,
    role: dto.角色,
    isActive: dto.是否启用,
  };
}

export async function getCurrentAccount(): Promise<AdminAccount> {
  return mapAccount(await apiRequest<UserDto>("/auth/me"));
}

export async function updateCurrentProfile(input: UpdateAdminProfileInput): Promise<AdminAccount> {
  const payload: ProfileUpdateDto = { 真实姓名: input.realName };
  return mapAccount(await apiRequest<UserDto>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  }));
}

export async function changeCurrentPassword(input: ChangePasswordInput): Promise<void> {
  const payload: PasswordChangeDto = { 原密码: input.oldPassword, 新密码: input.newPassword };
  await apiRequest<{ message: string }>("/auth/password", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const dto = await apiRequest<HealthDto>("/health");
  return { serviceStatus: dto.status, databaseStatus: dto.database };
}
