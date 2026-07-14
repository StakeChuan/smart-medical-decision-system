import { FileSearch } from "lucide-react";

export function AiReportOverview() {
  return <section className="admin-ai-panel"><div className="admin-ai-panel-heading"><FileSearch className="h-5 w-5" /><div><h2>近期 AI 报告</h2><p>全局报告浏览需要包含患者、问诊和风险信息的管理员查询接口。</p></div></div><div className="admin-ai-unavailable"><FileSearch className="h-5 w-5" /><div><strong>当前后端暂未提供</strong><p>本页面不会扫描全部患者、读取 CSV 导出或解析日志文本来拼装报告数据。</p></div></div></section>;
}
