import { Activity } from "lucide-react";

export function RouteLoadingFallback() {
  return <div className="route-loading" role="status" aria-live="polite"><div className="route-loading-mark"><Activity className="h-5 w-5" /></div><div><strong>正在加载工作区</strong><p>正在准备页面资源，请稍候。</p></div></div>;
}
