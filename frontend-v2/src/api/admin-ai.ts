import { apiRequest } from "./client";
import type { AdminAiAuditPage, AdminAiAuditRecord } from "@/features/admin/ai/types";

interface AdminAiAuditRecordDto {
  日志ID: number;
  用户ID: number | null;
  用户名: string | null;
  角色: string | null;
  操作: string;
  模块: string;
  对象类型: string | null;
  对象ID: string | null;
  详情: string | null;
  创建时间: string;
}

interface AdminAiAuditPageDto {
  日志列表: AdminAiAuditRecordDto[];
  总数: number;
  页码: number;
  每页数量: number;
}

function mapAiAuditRecord(item: AdminAiAuditRecordDto): AdminAiAuditRecord {
  return {
    id: item.日志ID,
    userId: item.用户ID,
    username: item.用户名,
    role: item.角色,
    action: item.操作,
    targetType: item.对象类型,
    targetId: item.对象ID,
    detail: item.详情,
    createdAt: item.创建时间,
  };
}

export async function getAdminAiAudit(): Promise<AdminAiAuditPage> {
  const params = new URLSearchParams({ module: "AI报告", page: "1", page_size: "5" });
  const data = await apiRequest<AdminAiAuditPageDto>(`/admin/operation-logs?${params.toString()}`);
  return {
    items: data.日志列表.map(mapAiAuditRecord),
    total: data.总数,
    page: data.页码,
    pageSize: data.每页数量,
  };
}
