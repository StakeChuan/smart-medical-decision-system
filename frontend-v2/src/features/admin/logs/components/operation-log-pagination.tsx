import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OperationLogPagination({ page, pageSize, total, disabled, onPageChange }: { page: number; pageSize: number; total: number; disabled: boolean; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="admin-log-pagination"><span>共 {total} 条</span><div><Button variant="secondary" size="sm" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft className="h-4 w-4" />上一页</Button><strong>第 {page} / {totalPages} 页</strong><Button variant="secondary" size="sm" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>下一页<ChevronRight className="h-4 w-4" /></Button></div></div>;
}
