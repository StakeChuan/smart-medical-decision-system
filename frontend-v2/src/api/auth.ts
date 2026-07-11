import { apiRequest } from "./client";
import type { User } from "@/types/api";

interface LoginPayload {
  用户名: string;
  密码: string;
}

interface LoginResponse {
  用户ID: number;
  用户名: string;
  真实姓名: string | null;
  角色: "doctor" | "admin";
  是否启用: boolean;
  访问令牌: string;
}

export async function loginRequest(username: string, password: string): Promise<User> {
  const data = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ 用户名: username, 密码: password } satisfies LoginPayload),
  });
  return {
    id: data.用户ID,
    username: data.用户名,
    realName: data.真实姓名,
    role: data.角色,
    isActive: data.是否启用,
    token: data.访问令牌,
  };
}
