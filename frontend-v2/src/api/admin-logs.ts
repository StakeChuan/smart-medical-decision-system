import { apiRequest } from "./client";
import type { OperationLog, OperationLogFilters, OperationLogPage } from "@/features/admin/logs/types";

interface OperationLogDto {
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

interface OperationLogPageDto {
  日志列表: OperationLogDto[];
  总数: number;
  页码: number;
  每页数量: number;
}

function mapOperationLog(item: OperationLogDto): OperationLog {
  return {
    id: item.日志ID,
    userId: item.用户ID,
    username: item.用户名,
    role: item.角色,
    action: item.操作,
    module: item.模块,
    targetType: item.对象类型,
    targetId: item.对象ID,
    detail: item.详情,
    createdAt: item.创建时间,
  };
}

export async function getAdminOperationLogs(filters: OperationLogFilters): Promise<OperationLogPage> {
  const params = new URLSearchParams({
    page: String(filters.page),
    page_size: String(filters.pageSize),
  });
  if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
  if (filters.module.trim()) params.set("module", filters.module.trim());
  if (filters.action.trim()) params.set("action", filters.action.trim());
  const data = await apiRequest<OperationLogPageDto>(`/admin/operation-logs?${params.toString()}`);
  return {
    items: data.日志列表.map(mapOperationLog),
    total: data.总数,
    page: data.页码,
    pageSize: data.每页数量,
  };
}
