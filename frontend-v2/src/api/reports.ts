import { ApiError, apiRequest } from "./client";
import { toAiReport } from "./mappers";
import type { AiReport, AiReportDto, GenerateReportOptions } from "@/types/report";

export async function generateReport(
  consultationId: number,
  options: GenerateReportOptions = {},
): Promise<AiReport> {
  const { force = false, confirmed = false } = options;
  if (force && !confirmed) {
    throw new ApiError("重新生成会覆盖当前 AI 报告，请先确认操作。", {
      status: 400,
      code: "CONFIRMATION_REQUIRED",
    });
  }
  const query = force ? "?force=true" : "";
  const dto = await apiRequest<AiReportDto>(`/ai/decision/${consultationId}${query}`, {
    method: "POST",
  });
  return toAiReport(dto);
}
