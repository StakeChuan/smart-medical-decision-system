import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RouteChunkBoundaryProps {
  children: ReactNode;
}

interface RouteChunkBoundaryState {
  error: Error | null;
}

export class RouteChunkBoundary extends Component<RouteChunkBoundaryProps, RouteChunkBoundaryState> {
  state: RouteChunkBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteChunkBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Route module failed to load", error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return <div className="route-load-error" role="alert"><AlertCircle className="h-6 w-6" /><strong>页面资源加载失败</strong><p>网络连接可能中断，或页面资源已经更新。重新加载后将继续停留在当前地址。</p><Button variant="secondary" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" />重新加载页面</Button></div>;
  }
}
