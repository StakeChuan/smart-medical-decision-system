export interface AdminAiAuditRecord {
  id: number;
  userId: number | null;
  username: string | null;
  role: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
}

export interface AdminAiAuditPage {
  items: AdminAiAuditRecord[];
  total: number;
  page: number;
  pageSize: number;
}
