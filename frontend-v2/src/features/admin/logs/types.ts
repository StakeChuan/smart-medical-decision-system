export interface OperationLog {
  id: number;
  userId: number | null;
  username: string | null;
  role: string | null;
  action: string;
  module: string;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
}

export interface OperationLogFilters {
  keyword: string;
  module: string;
  action: string;
  page: number;
  pageSize: number;
}

export interface OperationLogPage {
  items: OperationLog[];
  total: number;
  page: number;
  pageSize: number;
}
