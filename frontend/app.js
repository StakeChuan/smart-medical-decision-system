function resolveApiBase() {
  const hostname = window.location.hostname;
  if (!hostname || window.location.protocol === "file:") {
    return "http://127.0.0.1:8000";
  }
  return `http://${hostname}:8000`;
}

const API_BASE = resolveApiBase();

const LAST_USERNAME_STORAGE_KEY = "smartMedicalLastUsername";
const storedUser = JSON.parse(localStorage.getItem("smartMedicalUser") || "null");

const state = {
  patients: [],
  doctors: [],
  selectedDoctor: null,
  selectedDoctorPatients: [],
  selectedHistoryPatient: null,
  historyConsultations: [],
  dashboardStats: null,
  doctorDashboardStats: null,
  operationLogs: {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  },
  operationLogFilters: {
    keyword: "",
    module: "",
    action: "",
  },
  editingPatientId: null,
  isSavingConsultation: false,
  isRegeneratingReport: false,
  regeneratingHistoryIndex: null,
  expandedHistoryReportIndex: null,
  lastReport: null,
  lastReportConsultationId: null,
  clearReportOnNextOpen: false,
  currentUser: storedUser,
  currentToken: storedUser ? storedUser["访问令牌"] || storedUser.token || "" : "",
  doctorStatsFilters: {
    keyword: "",
    sortBy: "consultation_count",
    sortOrder: "desc",
  },
};

const $ = (selector) => document.querySelector(selector);

function currentUserId() {
  return state.currentUser ? state.currentUser["用户ID"] || state.currentUser.id : null;
}

function currentUserRole() {
  return state.currentUser ? state.currentUser["角色"] || state.currentUser.role : "";
}

function isAdmin() {
  return currentUserRole() === "admin";
}

function currentUsername() {
  return state.currentUser ? state.currentUser["用户名"] || state.currentUser.username || "" : "";
}

function currentRealName() {
  return state.currentUser ? state.currentUser["真实姓名"] || state.currentUser.real_name || "" : "";
}

function currentIsActive() {
  if (!state.currentUser) return false;
  const value = state.currentUser["是否启用"] ?? state.currentUser.is_active;
  return value !== false && value !== 0;
}

function mergeUserWithToken(user) {
  if (!user) return null;
  return {
    ...user,
    token: state.currentToken,
    访问令牌: state.currentToken,
  };
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  window.setTimeout(() => el.classList.remove("show"), 2400);
}

function setLoginError(message = "") {
  const el = $("#loginError");
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("show", Boolean(message));
}

function restoreLastLoginUsername() {
  const usernameInput = $("#loginUsername");
  const passwordInput = $("#loginPassword");
  if (usernameInput && !usernameInput.value) {
    usernameInput.value = localStorage.getItem(LAST_USERNAME_STORAGE_KEY) || "";
  }
  if (passwordInput) {
    passwordInput.value = "";
  }
}

function setCurrentSession(user) {
  state.currentUser = user;
  state.currentToken = user ? user["访问令牌"] || user.token || "" : "";
  if (user) {
    localStorage.setItem("smartMedicalUser", JSON.stringify(user));
  } else {
    localStorage.removeItem("smartMedicalUser");
  }
}

function resetRuntimeState() {
  state.patients = [];
  state.doctors = [];
  state.selectedDoctor = null;
  state.selectedDoctorPatients = [];
  state.selectedHistoryPatient = null;
  state.historyConsultations = [];
  state.dashboardStats = null;
  state.doctorDashboardStats = null;
  state.operationLogs = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  };
  state.operationLogFilters = {
    keyword: "",
    module: "",
    action: "",
  };
  state.editingPatientId = null;
  state.isSavingConsultation = false;
  state.isRegeneratingReport = false;
  state.regeneratingHistoryIndex = null;
  state.lastReport = null;
  state.lastReportConsultationId = null;
  state.clearReportOnNextOpen = false;
}

function logout(showToast = false) {
  setCurrentSession(null);
  resetRuntimeState();
  updateLoginState();
  renderDoctorDashboard();
  renderAdminDashboard();
  renderDoctors();
  renderDoctorPatients([]);
  renderPatientHistory([], "#patientHistoryList");
  renderPatientHistory([], "#doctorHistoryList");
  clearReport();
  switchView("dashboard");
  if (showToast) toast("已退出登录");
}

function formatDateTime(value) {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).replace("T", " ");
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}

function buildQuery(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function showLoading(selector, message = "加载中...") {
  const el = $(selector);
  if (el) {
    el.innerHTML = `<div class="report-empty">${escapeHtml(message)}</div>`;
  }
}

function formatValidationMessage(item) {
  if (!item || typeof item !== "object") return String(item || "");
  const field = Array.isArray(item.loc) ? item.loc.filter((part) => part !== "body").join(".") : "";
  const message = String(item.msg || item.message || item.detail || "输入内容不符合要求").replace(/^Value error,\s*/, "");
  return field ? `${field}：${message}` : message;
}

function formatErrorMessage(error, statusCode) {
  const detail = error?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map(formatValidationMessage).filter(Boolean).join("；") || `请求失败：${statusCode}`;
  }
  if (detail && typeof detail === "object") {
    return formatValidationMessage(detail);
  }
  if (typeof error?.message === "string") return error.message;
  return `请求失败：${statusCode}`;
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.currentToken) {
    headers.Authorization = `Bearer ${state.currentToken}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (error) {
    throw new Error("无法连接后端，请确认 uvicorn 正在运行并刷新页面");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = formatErrorMessage(error, response.status);
    if (response.status === 401 && path !== "/auth/login") {
      logout();
      throw new Error("登录已过期，请重新登录");
    }
    throw new Error(message);
  }

  return response.json();
}

function parseDownloadFilename(disposition, fallback) {
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  return match ? match[1] : fallback;
}

async function downloadAdminExport(type) {
  if (!isAdmin()) {
    toast("只有管理员可以导出数据");
    return;
  }

  const exportNames = {
    doctors: "admin_doctors.csv",
    patients: "admin_patients.csv",
    consultations: "admin_consultations.csv",
    reports: "admin_ai_reports.csv",
  };
  if (!exportNames[type]) {
    toast("未知的导出类型");
    return;
  }

  try {
    toast("正在生成导出文件");
    const headers = {};
    if (state.currentToken) {
      headers.Authorization = `Bearer ${state.currentToken}`;
    }
    const response = await fetch(`${API_BASE}/admin/export/${type}`, { headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 401) {
        logout();
        throw new Error("登录已过期，请重新登录");
      }
      throw new Error(formatErrorMessage(error, response.status));
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = parseDownloadFilename(response.headers.get("Content-Disposition"), exportNames[type]);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast("导出文件已生成");
  } catch (error) {
    toast(error.message || "导出失败，请确认后端已启动");
  }
}

async function checkHealth() {
  const status = $("#apiStatus");
  const backendState = $("#backendState");
  try {
    await request("/health");
    status.textContent = "后端正常";
    status.className = "status-dot ok";
    backendState.textContent = "已连接";
  } catch (error) {
    status.textContent = "后端异常";
    status.className = "status-dot bad";
    backendState.textContent = "未连接";
  }
}

function updateLoginState() {
  const loginScreen = $("#loginScreen");
  const currentDoctor = $("#currentDoctor");
  const currentRole = $("#currentRole");
  const doctorDashboard = $("#doctorDashboard");
  const adminDashboard = $("#adminDashboard");

  if (!state.currentUser) {
    loginScreen.classList.add("active");
    restoreLastLoginUsername();
    currentDoctor.textContent = "未登录";
    currentRole.textContent = "未登录";
    doctorDashboard.hidden = false;
    adminDashboard.hidden = true;
    document.querySelectorAll(".admin-only").forEach((el) => {
      el.style.display = "none";
    });
    renderSettings();
    return;
  }

  loginScreen.classList.remove("active");
  const name = state.currentUser["真实姓名"] || state.currentUser.real_name || state.currentUser.username;
  currentDoctor.textContent = `${name} ID:${currentUserId()}`;
  currentRole.textContent = isAdmin() ? "管理员" : "医生";
  doctorDashboard.hidden = isAdmin();
  adminDashboard.hidden = !isAdmin();

  document.querySelectorAll(".admin-only").forEach((el) => {
    el.style.display = isAdmin() ? "block" : "none";
  });

  renderSettings();
}

function renderSettings() {
  const displayNameEl = $("#settingsDisplayName");
  if (!displayNameEl) return;

  if (!state.currentUser) {
    displayNameEl.textContent = "未登录";
    $("#settingsUsername").textContent = "用户名：-";
    $("#settingsUserId").textContent = "-";
    $("#settingsRole").textContent = "-";
    $("#settingsActive").textContent = "-";
    $("#settingsStatus").textContent = "请先登录";
    $("#settingsAvatar").textContent = "医";
    $("#profileRealName").value = "";
    $("#passwordForm")?.reset();
    return;
  }

  const username = currentUsername();
  const realName = currentRealName();
  const displayName = realName || username || "未命名用户";
  const roleText = isAdmin() ? "管理员" : "医生";
  const activeText = currentIsActive() ? "启用" : "已禁用";

  displayNameEl.textContent = displayName;
  $("#settingsUsername").textContent = `用户名：${username || "-"}`;
  $("#settingsUserId").textContent = currentUserId() || "-";
  $("#settingsRole").textContent = roleText;
  $("#settingsActive").textContent = activeText;
  $("#settingsStatus").textContent = "当前登录账号";
  $("#settingsAvatar").textContent = roleText.slice(0, 1);
  $("#profileRealName").value = realName;
}

async function login(event) {
  event.preventDefault();
  setLoginError();
  const username = $("#loginUsername").value.trim();
  const password = $("#loginPassword").value.trim();

  try {
    const user = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ 用户名: username, 密码: password }),
    });
    localStorage.setItem(LAST_USERNAME_STORAGE_KEY, username);
    setCurrentSession(user);
    updateLoginState();
    await init();
    switchView("dashboard");
    toast("登录成功");
  } catch (error) {
    const message = error.message.includes("无法连接后端")
      ? "无法连接后端，请确认 uvicorn 正在运行"
      : error.message;
    setLoginError(message);
    toast(message);
  }
}

async function loadCurrentUser() {
  if (!state.currentUser) return;
  const user = await request("/auth/me");
  setCurrentSession(mergeUserWithToken(user));
  updateLoginState();
}

async function saveProfile(event) {
  event.preventDefault();
  if (!state.currentUser) {
    toast("请先登录");
    return;
  }

  const realName = $("#profileRealName").value.trim();
  try {
    const user = await request("/auth/profile", {
      method: "PUT",
      body: JSON.stringify({ 真实姓名: realName || null }),
    });
    setCurrentSession(mergeUserWithToken(user));
    updateLoginState();
    toast("资料已保存");
  } catch (error) {
    toast(error.message);
  }
}

async function changePassword(event) {
  event.preventDefault();
  if (!state.currentUser) {
    toast("请先登录");
    return;
  }

  const oldPassword = $("#oldPassword").value.trim();
  const newPassword = $("#newPassword").value.trim();
  const confirmPassword = $("#confirmPassword").value.trim();

  if (!oldPassword || !newPassword) {
    toast("请填写原密码和新密码");
    return;
  }
  if (newPassword !== confirmPassword) {
    toast("两次输入的新密码不一致");
    return;
  }

  try {
    await request("/auth/password", {
      method: "PUT",
      body: JSON.stringify({ 原密码: oldPassword, 新密码: newPassword }),
    });
    $("#passwordForm").reset();
    toast("密码修改成功，请牢记新密码");
  } catch (error) {
    toast(error.message);
  }
}

function getReportText(report) {
  if (!report) return "";
  const patientSummary = report["患者摘要"] || report.patient_summary || "";
  const keyFindings = report["关键发现"] || report.key_findings || "";
  const riskLevel = report["风险等级"] || report.risk_level || "";
  const urgencyLevel = report["紧急程度"] || report.urgency_level || "";
  const followUpAdvice = report["复诊建议"] || report.follow_up_advice || "";
  return (
    report["完整报告"] ||
    report.full_report ||
    [
      `患者摘要：${patientSummary}`,
      `关键发现：${keyFindings}`,
      `可能疾病：${report["可能疾病"] || report.possible_diseases || ""}`,
      `建议检查：${report["建议检查"] || report.suggested_checks || ""}`,
      `风险等级：${riskLevel}`,
      `紧急程度：${urgencyLevel}`,
      `辅助建议：${report["辅助建议"] || report.treatment_advice || ""}`,
      `复诊建议：${followUpAdvice}`,
      `风险提示：${report["风险提示"] || report.risk_warning || ""}`,
    ].filter((line) => !line.endsWith("：")).join("\n")
  );
}

function getReportField(report, chineseKey, englishKey, fallback = "未填写") {
  const value = report?.[chineseKey] ?? report?.[englishKey];
  return value === null || value === undefined || value === "" ? fallback : value;
}

function getRiskClass(value) {
  if (value === "高" || value === "紧急") return "is-high";
  if (value === "中" || value === "尽快") return "is-medium";
  if (value === "低" || value === "常规") return "is-low";
  return "";
}

function renderReportBadge(label, value) {
  const text = value || "待评估";
  return `<span class="report-badge ${getRiskClass(text)}"><small>${label}</small>${escapeHtml(text)}</span>`;
}

function renderReportSection(title, value, className = "") {
  const text = value || "未填写";
  return `
    <section class="report-card ${className}">
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(text)}</p>
    </section>
  `;
}

function renderStructuredReport(report) {
  if (!report) return "";
  const patientSummary = getReportField(report, "患者摘要", "patient_summary", "");
  const keyFindings = getReportField(report, "关键发现", "key_findings", "");
  const possibleDiseases = getReportField(report, "可能疾病", "possible_diseases", "");
  const suggestedChecks = getReportField(report, "建议检查", "suggested_checks", "");
  const riskLevel = getReportField(report, "风险等级", "risk_level", "待评估");
  const urgencyLevel = getReportField(report, "紧急程度", "urgency_level", "常规");
  const treatmentAdvice = getReportField(report, "辅助建议", "treatment_advice", "");
  const followUpAdvice = getReportField(report, "复诊建议", "follow_up_advice", "");
  const riskWarning = getReportField(report, "风险提示", "risk_warning", "");
  const hasStructuredFields = [
    patientSummary,
    keyFindings,
    possibleDiseases,
    suggestedChecks,
    treatmentAdvice,
    followUpAdvice,
    riskWarning,
  ].some(Boolean);

  if (!hasStructuredFields) {
    return `<pre class="report-legacy-text">${escapeHtml(getReportText(report))}</pre>`;
  }

  return `
    <div class="report-summary-head">
      ${renderReportBadge("风险等级", riskLevel)}
      ${renderReportBadge("紧急程度", urgencyLevel)}
    </div>
    <div class="report-card-grid">
      ${renderReportSection("患者摘要", patientSummary, "wide-report-card")}
      ${renderReportSection("关键发现", keyFindings, "wide-report-card")}
      ${renderReportSection("可能疾病", possibleDiseases)}
      ${renderReportSection("建议检查", suggestedChecks)}
      ${renderReportSection("辅助建议", treatmentAdvice)}
      ${renderReportSection("复诊 / 转诊建议", followUpAdvice)}
      ${renderReportSection("风险提示", riskWarning, "wide-report-card warning-report-card")}
    </div>
    <p class="report-disclaimer">本系统输出仅供医生辅助参考，不能替代医生诊断。</p>
  `;
}

function getReportPreviewHtml(report) {
  if (!report) return "<p>暂无AI报告</p>";
  const riskLevel = report["风险等级"] || report.risk_level || "待评估";
  const urgencyLevel = report["紧急程度"] || report.urgency_level || "常规";
  const possibleDiseases = report["可能疾病"] || report.possible_diseases || "暂无可能疾病摘要";
  const suggestedChecks = report["建议检查"] || report.suggested_checks || "暂无建议检查摘要";
  return `
    <div class="history-report-badges">
      ${renderReportBadge("风险", riskLevel)}
      ${renderReportBadge("紧急", urgencyLevel)}
    </div>
    <p><strong>可能疾病：</strong>${escapeHtml(possibleDiseases)}</p>
    <p><strong>建议检查：</strong>${escapeHtml(suggestedChecks)}</p>
  `;
}

function getFullReportHtml(report) {
  if (!report) return "";
  const fullText = report["完整报告"] || report.full_report || "";
  return `
    <div class="history-full-report">
      <div class="history-report-title">完整AI报告</div>
      ${renderStructuredReport(report)}
      ${fullText ? `<details class="history-full-report-text"><summary>查看原始完整文本</summary><pre>${escapeHtml(fullText)}</pre></details>` : ""}
    </div>
  `;
}

function updateReportActions() {
  const hasReport = Boolean(getReportText(state.lastReport));
  const canRegenerate = Boolean(state.lastReportConsultationId) && !state.isRegeneratingReport;
  const copyBtn = $("#copyReportBtn");
  const printBtn = $("#printReportBtn");
  const regenerateBtn = $("#regenerateReportBtn");
  if (copyBtn) copyBtn.disabled = !hasReport;
  if (printBtn) printBtn.disabled = !hasReport;
  if (regenerateBtn) {
    regenerateBtn.disabled = !canRegenerate;
    regenerateBtn.textContent = state.isRegeneratingReport ? "重新生成中..." : "重新生成";
  }
}

function clearReport() {
  state.lastReport = null;
  state.lastReportConsultationId = null;
  $("#reportTime").textContent = "暂无报告";
  $("#reportContent").className = "report-empty";
  $("#reportContent").textContent = "尚未生成报告。请先录入问诊信息。";
  updateReportActions();
}

function renderReport(report) {
  state.lastReport = report;
  state.lastReportConsultationId = report["问诊ID"] || report.consultation_id || state.lastReportConsultationId;
  $("#reportTime").textContent = formatDateTime(report["创建时间"] || report.created_at || new Date());
  $("#reportContent").className = "report-content";
  $("#reportContent").innerHTML = renderStructuredReport(report);
  updateReportActions();
}

function renderDoctorDashboard() {
  const stats = state.doctorDashboardStats;
  $("#patientCount").textContent = stats?.["患者总数"] ?? stats?.patient_count ?? state.patients.length;
  $("#doctorTodayConsultationCount").textContent = stats?.["今日问诊数"] ?? stats?.today_consultation_count ?? 0;
  $("#doctorConsultationCount").textContent = stats?.["问诊总数"] ?? stats?.consultation_count ?? 0;
  $("#doctorReportCount").textContent = stats?.["AI报告总数"] ?? stats?.ai_report_count ?? 0;
  renderDoctorRecentPatients(stats?.["最近患者"] || stats?.recent_patients || []);
  renderDoctorRecentConsultations(stats?.["最近问诊"] || stats?.recent_consultations || []);
}

function renderDoctorRecentPatients(patients) {
  const list = $("#doctorRecentPatients");
  if (!list) return;
  if (!patients.length) {
    list.innerHTML = '<div class="report-empty">暂无最近患者。</div>';
    return;
  }

  list.innerHTML = patients
    .map((patient) => {
      const patientId = patient["患者ID"] || patient.patient_id;
      const name = patient["姓名"] || patient.name || "未命名患者";
      const gender = patient["性别"] || patient.gender || "未填";
      const age = patient["年龄"] ?? patient.age ?? "未填";
      const count = patient["问诊次数"] ?? patient.consultation_count ?? 0;
      const lastTime = patient["最近问诊时间"] || patient.last_consultation_time;
      return `
        <div class="stack-item doctor-home-item">
          <strong>${escapeHtml(name)}</strong>
          <p>${escapeHtml(gender)} / ${escapeHtml(age)}岁 · 问诊 ${count} 次</p>
          <p>最近问诊：${formatDateTime(lastTime)}</p>
          <button class="ghost-btn" type="button" onclick="showPatientHistory(${patientId})">查看详情</button>
        </div>
      `;
    })
    .join("");
}

function renderDoctorRecentConsultations(consultations) {
  const list = $("#doctorRecentConsultations");
  if (!list) return;
  if (!consultations.length) {
    list.innerHTML = '<div class="report-empty">暂无最近问诊。</div>';
    return;
  }

  list.innerHTML = consultations
    .map((item) => {
      const patientId = item["患者ID"] || item.patient_id;
      const patientName = item["患者姓名"] || item.patient_name || "未命名患者";
      const chiefComplaint = item["主诉"] || item.chief_complaint || "未填写主诉";
      const hasReport = item["是否生成AI报告"] ?? item.has_ai_report;
      const createdAt = item["创建时间"] || item.created_at;
      return `
        <div class="stack-item doctor-home-item">
          <strong>${escapeHtml(patientName)}</strong>
          <p>${escapeHtml(chiefComplaint)}</p>
          <p>${formatDateTime(createdAt)} · ${hasReport ? "已生成AI报告" : "暂无AI报告"}</p>
          <button class="ghost-btn" type="button" onclick="showPatientHistory(${patientId})">查看历史</button>
        </div>
      `;
    })
    .join("");
}

function renderAdminDashboard() {
  const stats = state.dashboardStats;
  if (!isAdmin() || !stats) {
    $("#adminDoctorCount").textContent = "0";
    $("#adminPatientCount").textContent = "0";
    $("#adminConsultationCount").textContent = "0";
    $("#adminReportCount").textContent = "0";
    $("#adminTodayConsultationCount").textContent = "0";
    showLoading("#trendList", "登录后查看统计概览");
    showLoading("#topDoctorList", "登录后查看医生排行");
    showLoading("#recentPatientList", "登录后查看患者动态");
    showLoading("#activePatientList", "登录后查看活跃患者");
    return;
  }

  $("#adminDoctorCount").textContent = stats["医生总数"] ?? stats.doctor_count ?? 0;
  $("#adminPatientCount").textContent = stats["患者总数"] ?? stats.patient_count ?? 0;
  $("#adminConsultationCount").textContent = stats["问诊总数"] ?? stats.consultation_count ?? 0;
  $("#adminReportCount").textContent = stats["报告总数"] ?? stats.ai_report_count ?? 0;
  $("#adminTodayConsultationCount").textContent = stats["今日问诊数"] ?? stats.today_consultation_count ?? 0;

  renderTrendList(stats["近7天问诊趋势"] || stats.consultation_trend || []);
  renderTopDoctorList(stats["医生排行"] || stats.top_doctors || []);
  renderRecentPatientList(stats["最近新增患者"] || stats.recent_patients || []);
  renderActivePatientList(stats["活跃患者"] || stats.active_patients || []);
}

function renderTrendList(points) {
  const list = $("#trendList");
  if (!points.length) {
    list.innerHTML = '<div class="report-empty">暂无趋势数据。</div>';
    return;
  }

  const maxCount = Math.max(...points.map((point) => point["问诊数量"] ?? point.consultation_count ?? 0), 1);
  const totalCount = points.reduce((sum, point) => sum + Number(point["问诊数量"] ?? point.consultation_count ?? 0), 0);
  const activeDays = points.filter((point) => Number(point["问诊数量"] ?? point.consultation_count ?? 0) > 0).length;
  const rows = points
    .map((point) => {
      const dateText = (point["日期"] || point.date || "").slice(5);
      const count = point["问诊数量"] ?? point.consultation_count ?? 0;
      const width = Math.max(10, Math.round((count / maxCount) * 100));
      return `
        <div class="trend-row">
          <span class="trend-label">${escapeHtml(dateText)}</span>
          <div class="trend-bar"><div class="trend-fill" style="width:${width}%"></div></div>
          <strong class="trend-value">${count}</strong>
        </div>
      `;
    })
    .join("");
  list.innerHTML = `
    <div class="dashboard-summary">
      <span>近 7 天合计 ${totalCount} 次问诊</span>
      <span>${activeDays} 天有问诊记录</span>
    </div>
    ${rows}
  `;
}

function renderTopDoctorList(doctors) {
  const list = $("#topDoctorList");
  if (!doctors.length) {
    list.innerHTML = '<div class="report-empty">暂无医生统计。</div>';
    return;
  }

  list.innerHTML = doctors
    .map((doctor, index) => {
      const id = doctor["医生ID"] || doctor.doctor_id;
      const reportCount = doctor["报告数量"] ?? doctor.ai_report_count ?? 0;
      return `
        <div class="rank-item">
          <span class="rank-badge">${index + 1}</span>
          <div>
            <strong>${escapeHtml(doctor["医生姓名"] || doctor.real_name || doctor.username || "未命名医生")}</strong>
            <p>患者 ${doctor["患者数量"] ?? doctor.patient_count ?? 0} · 问诊 ${doctor["问诊次数"] ?? doctor.consultation_count ?? 0} · 报告 ${reportCount}</p>
          </div>
          <button class="ghost-btn" type="button" onclick="openDoctorDetail(${id})">明细</button>
        </div>
      `;
    })
    .join("");
}

function renderRecentPatientList(patients) {
  const list = $("#recentPatientList");
  if (!patients.length) {
    list.innerHTML = '<div class="report-empty">暂无新增患者。</div>';
    return;
  }

  list.innerHTML = patients
    .map((patient) => `
      <div class="stack-item">
        <strong>${escapeHtml(patient["姓名"] || patient.name || "未命名患者")}</strong>
        <p>${escapeHtml(patient["医生姓名"] || patient.doctor_name || "未分配")} · 新增于 ${formatDateTime(patient["创建时间"] || patient.created_at)}</p>
      </div>
    `)
    .join("");
}

function renderActivePatientList(patients) {
  const list = $("#activePatientList");
  if (!patients.length) {
    list.innerHTML = '<div class="report-empty">暂无活跃患者。</div>';
    return;
  }

  list.innerHTML = patients
    .map((patient) => `
      <div class="patient-row">
        <div>
          <strong>${escapeHtml(patient["姓名"] || patient.name || "未命名患者")}</strong>
          <p>${escapeHtml(patient["医生姓名"] || patient.doctor_name || "未分配")}</p>
          <p>问诊次数：${patient["问诊次数"] ?? patient.consultation_count ?? 0} · 最近问诊：${formatDateTime(patient["最近问诊时间"] || patient.last_consultation_time)}</p>
        </div>
      </div>
    `)
    .join("");
}

function getOperationLogValue(log, chineseKey, englishKey, fallback = "") {
  const value = log?.[chineseKey] ?? log?.[englishKey];
  return value === null || value === undefined || value === "" ? fallback : value;
}

function getOperationLogFiltersFromInputs() {
  state.operationLogFilters.keyword = $("#operationLogKeyword")?.value.trim() || "";
  state.operationLogFilters.module = $("#operationLogModule")?.value || "";
  state.operationLogFilters.action = $("#operationLogAction")?.value || "";
}

function syncOperationLogFiltersToInputs() {
  if ($("#operationLogKeyword")) $("#operationLogKeyword").value = state.operationLogFilters.keyword;
  if ($("#operationLogModule")) $("#operationLogModule").value = state.operationLogFilters.module;
  if ($("#operationLogAction")) $("#operationLogAction").value = state.operationLogFilters.action;
}

function resetOperationLogFilters() {
  state.operationLogFilters = {
    keyword: "",
    module: "",
    action: "",
  };
  state.operationLogs.page = 1;
  syncOperationLogFiltersToInputs();
}

async function loadOperationLogs(page = state.operationLogs.page || 1) {
  if (!isAdmin()) return;
  getOperationLogFiltersFromInputs();
  showLoading("#operationLogList", "正在加载操作日志...");
  const query = buildQuery({
    keyword: state.operationLogFilters.keyword,
    module: state.operationLogFilters.module,
    action: state.operationLogFilters.action,
    page,
    page_size: state.operationLogs.pageSize,
  });
  const result = await request(`/admin/operation-logs${query}`);
  state.operationLogs = {
    items: result["日志列表"] || result.items || [],
    total: result["总数"] ?? result.total ?? 0,
    page: result["页码"] ?? result.page ?? page,
    pageSize: result["每页数量"] ?? result.page_size ?? state.operationLogs.pageSize,
  };
  renderOperationLogs();
}

function renderOperationLogs() {
  const list = $("#operationLogList");
  if (!list) return;

  const { items, total, page, pageSize } = state.operationLogs;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  $("#operationLogHint").textContent = `共 ${total} 条记录`;
  $("#operationLogPageHint").textContent = `第 ${page} / ${totalPages} 页`;
  $("#operationLogPrevBtn").disabled = page <= 1;
  $("#operationLogNextBtn").disabled = page >= totalPages;

  if (!items.length) {
    list.innerHTML = '<div class="report-empty">暂无操作日志。</div>';
    return;
  }

  list.innerHTML = items
    .map((log) => {
      const username = getOperationLogValue(log, "用户名", "username", "未知用户");
      const role = getOperationLogValue(log, "角色", "role", "未知角色");
      const moduleName = getOperationLogValue(log, "模块", "module", "-");
      const action = getOperationLogValue(log, "操作", "action", "-");
      const targetType = getOperationLogValue(log, "对象类型", "target_type", "-");
      const targetId = getOperationLogValue(log, "对象ID", "target_id", "-");
      const detail = getOperationLogValue(log, "详情", "detail", "无详情");
      const createdAt = getOperationLogValue(log, "创建时间", "created_at", "");
      return `
        <div class="log-item">
          <div class="log-main">
            <strong>${escapeHtml(moduleName)} · ${escapeHtml(action)}</strong>
            <p>${escapeHtml(detail)}</p>
          </div>
          <div class="log-meta">
            <span>${escapeHtml(formatDateTime(createdAt))}</span>
            <span>${escapeHtml(username)} / ${escapeHtml(role)}</span>
            <span>${escapeHtml(targetType)}：${escapeHtml(targetId)}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadPatients() {
  state.patients = await request("/patients");
  renderDoctorDashboard();
  renderPatients();
  renderPatientOptions();
}

function renderPatients() {
  $("#patientListHint").textContent = `${state.patients.length} 条`;
  const list = $("#patientList");

  if (!state.patients.length) {
    list.innerHTML = '<div class="report-empty">暂无患者，请先新增患者。</div>';
    return;
  }

  list.innerHTML = state.patients
    .map((patient) => {
      const id = patient["患者ID"] || patient.id;
      const doctorId = patient["医生ID"] || patient.doctor_id || "未绑定";
      return `
        <div class="patient-row patient-list-row">
          <div class="patient-row-info">
            <strong>${escapeHtml(patient["姓名"] || patient.name || "未命名患者")}</strong>
            <p>${escapeHtml(patient["性别"] || patient.gender || "未填")} / ${escapeHtml(patient["年龄"] || patient.age || "未填")}岁 / ${escapeHtml(patient["电话"] || patient.phone || "未填电话")}</p>
            <p>${escapeHtml(patient["地址"] || patient.address || "未填地址")} · 医生ID：${escapeHtml(doctorId)}</p>
          </div>
          <div class="row-actions patient-row-actions">
            <button class="ghost-btn" type="button" onclick="showPatientHistory(${id})">历史</button>
            <button class="ghost-btn" type="button" onclick="editPatient(${id})">编辑</button>
            <button class="danger-btn" type="button" onclick="deletePatient(${id})">删除</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderPatientOptions() {
  const select = $("#consultPatient");
  if (!state.patients.length) {
    select.innerHTML = '<option value="">暂无患者</option>';
    return;
  }

  select.innerHTML = state.patients
    .map((patient) => {
      const id = patient["患者ID"] || patient.id;
      const name = patient["姓名"] || patient.name;
      return `<option value="${id}">${escapeHtml(name)}（ID：${id}）</option>`;
    })
    .join("");
}

function getPatientPayload() {
  return {
    姓名: $("#name").value.trim(),
    性别: $("#gender").value.trim() || null,
    年龄: $("#age").value ? Number($("#age").value) : null,
    电话: $("#phone").value.trim() || null,
    地址: $("#address").value.trim() || null,
    既往病史: $("#medicalHistory").value.trim() || null,
    过敏史: $("#allergyHistory").value.trim() || null,
  };
}

function resetPatientForm() {
  state.editingPatientId = null;
  $("#patientFormTitle").textContent = "新增患者";
  $("#patientForm").reset();
  $("#patientId").value = "";
}

function clearConsultationForm() {
  $("#chiefComplaint").value = "";
  $("#symptoms").value = "";
  $("#presentIllness").value = "";
  $("#pastHistory").value = "";
  $("#examination").value = "";
}

function setConsultationSubmitting(isSubmitting) {
  state.isSavingConsultation = isSubmitting;
  const button = $('#consultationForm button[type="submit"]');
  const form = $("#consultationForm");
  if (button) {
    button.disabled = isSubmitting;
    button.textContent = isSubmitting ? "正在保存并生成AI报告中..." : "保存问诊并生成AI报告";
  }
  if (form) {
    form.dataset.submitting = isSubmitting ? "true" : "false";
  }
}

window.editPatient = function editPatient(id) {
  const patient = state.patients.find((item) => (item["患者ID"] || item.id) === id);
  if (!patient) return;

  state.editingPatientId = id;
  $("#patientFormTitle").textContent = "修改患者";
  $("#patientId").value = id;
  $("#name").value = patient["姓名"] || patient.name || "";
  $("#gender").value = patient["性别"] || patient.gender || "";
  $("#age").value = patient["年龄"] || patient.age || "";
  $("#phone").value = patient["电话"] || patient.phone || "";
  $("#address").value = patient["地址"] || patient.address || "";
  $("#medicalHistory").value = patient["既往病史"] || patient.medical_history || "";
  $("#allergyHistory").value = patient["过敏史"] || patient.allergy_history || "";
  switchView("patients");
};

window.deletePatient = async function deletePatient(id) {
  if (!window.confirm("确定删除这个患者吗？相关问诊记录也会被删除。")) return;
  try {
    await request(`/patients/${id}`, { method: "DELETE" });
    toast("患者已删除");
    resetPatientForm();
    await loadPatients();
    if (!isAdmin()) await loadDoctorDashboardData();
  } catch (error) {
    toast(error.message);
  }
};

async function savePatient(event) {
  event.preventDefault();
  const payload = getPatientPayload();
  if (!payload.姓名) {
    toast("请填写患者姓名");
    return;
  }
  if (payload.电话 && !/^[0-9+\-\s]{6,20}$/.test(payload.电话)) {
    toast("电话格式不正确，只能包含数字、空格、+ 或 -，长度 6-20 位");
    return;
  }

  try {
    if (state.editingPatientId) {
      await request(`/patients/${state.editingPatientId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast("患者信息已更新");
    } else {
      await request("/patients", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast("患者已新增");
    }
    resetPatientForm();
    await loadPatients();
    if (isAdmin()) await loadDashboardData();
    if (!isAdmin()) await loadDoctorDashboardData();
  } catch (error) {
    toast(error.message);
  }
}

async function saveConsultation(event) {
  event.preventDefault();
  if (state.isSavingConsultation) {
    toast("正在保存并生成报告中，请稍候");
    return;
  }
  const patientId = Number($("#consultPatient").value);
  if (!patientId) {
    toast("请先选择患者");
    return;
  }

  const payload = {
    患者ID: patientId,
    主诉: $("#chiefComplaint").value.trim() || null,
    症状: $("#symptoms").value.trim() || null,
    现病史: $("#presentIllness").value.trim() || null,
    既往史: $("#pastHistory").value.trim() || null,
    检查结果: $("#examination").value.trim() || null,
  };

  try {
    setConsultationSubmitting(true);
    toast("正在保存并生成报告中，请稍候");
    const consultation = await request("/consultations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const consultationId = consultation["问诊ID"] || consultation.id;
    const report = await request(`/ai/decision/${consultationId}`, { method: "POST" });
    state.lastReport = report;
    state.clearReportOnNextOpen = false;
    renderReport(report);
    clearConsultationForm();
    switchView("report");
    toast("AI报告已生成");
    await loadPatients();
    if (isAdmin()) {
      await loadDashboardData();
      await loadDoctorData();
    } else {
      await loadDoctorDashboardData();
    }
  } catch (error) {
    toast(error.message);
  } finally {
    setConsultationSubmitting(false);
  }
}

async function loadDashboardData() {
  if (!isAdmin()) return;
  showLoading("#trendList");
  showLoading("#topDoctorList");
  showLoading("#recentPatientList");
  showLoading("#activePatientList");
  state.dashboardStats = await request("/admin/dashboard");
  renderAdminDashboard();
}

async function loadDoctorDashboardData() {
  if (isAdmin()) return;
  state.doctorDashboardStats = await request("/doctor/dashboard");
  renderDoctorDashboard();
}

function getDoctorFiltersFromInputs() {
  state.doctorStatsFilters.keyword = $("#doctorSearch").value.trim();
  state.doctorStatsFilters.sortBy = $("#doctorSortBy").value;
  state.doctorStatsFilters.sortOrder = $("#doctorSortOrder").value;
}

function syncDoctorFiltersToInputs() {
  $("#doctorSearch").value = state.doctorStatsFilters.keyword;
  $("#doctorSortBy").value = state.doctorStatsFilters.sortBy;
  $("#doctorSortOrder").value = state.doctorStatsFilters.sortOrder;
}

function resetDoctorCreateForm() {
  $("#doctorCreateForm")?.reset();
}

function getDoctorId(doctor) {
  return doctor?.["医生ID"] || doctor?.doctor_id;
}

function getDoctorUsername(doctor) {
  return doctor?.["用户名"] || doctor?.username || "";
}

function getDoctorName(doctor) {
  return doctor?.["医生姓名"] || doctor?.real_name || getDoctorUsername(doctor) || "未命名医生";
}

function getDoctorActive(doctor) {
  const value = doctor?.["是否启用"] ?? doctor?.is_active;
  return value !== false && value !== 0;
}

async function refreshDoctorManagement(keepSelected = true) {
  const selectedId = keepSelected ? getDoctorId(state.selectedDoctor) : null;
  await Promise.all([loadDashboardData(), loadDoctorData()]);
  if (selectedId && state.doctors.some((doctor) => getDoctorId(doctor) === selectedId)) {
    await window.selectDoctor(selectedId);
  }
}

async function createDoctor(event) {
  event.preventDefault();
  const username = $("#newDoctorUsername").value.trim();
  const realName = $("#newDoctorRealName").value.trim();
  const password = $("#newDoctorPassword").value.trim();

  if (!username) {
    toast("请填写医生用户名");
    return;
  }
  if (!password) {
    toast("请填写医生初始密码");
    return;
  }

  try {
    await request("/admin/doctors", {
      method: "POST",
      body: JSON.stringify({
        用户名: username,
        医生姓名: realName || null,
        初始密码: password,
      }),
    });
    toast("医生账号已新增");
    resetDoctorCreateForm();
    await refreshDoctorManagement(false);
  } catch (error) {
    toast(error.message);
  }
}

async function loadDoctorData() {
  if (!isAdmin()) return;
  getDoctorFiltersFromInputs();
  showLoading("#doctorList");
  const query = buildQuery({
    keyword: state.doctorStatsFilters.keyword,
    sort_by: state.doctorStatsFilters.sortBy,
    sort_order: state.doctorStatsFilters.sortOrder,
  });
  state.doctors = await request(`/admin/doctors/stats${query}`);
  renderDoctors();
}

function renderDoctors() {
  const list = $("#doctorList");
  $("#doctorListHint").textContent = `${state.doctors.length} 名医生`;
  if (!state.doctors.length) {
    list.innerHTML = '<div class="report-empty">暂无医生统计数据。</div>';
    return;
  }

  list.innerHTML = state.doctors
    .map((doctor) => {
      const id = getDoctorId(doctor);
      const isActive = getDoctorActive(doctor);
      const statusText = isActive ? "启用" : "已禁用";
      const statusClass = isActive ? "active" : "disabled";
      return `
        <div class="patient-row doctor-row">
          <div class="doctor-row-info">
            <strong>${escapeHtml(getDoctorName(doctor))} <span class="status-pill ${statusClass}">${statusText}</span></strong>
            <p>医生ID：${id} · 用户名：${escapeHtml(getDoctorUsername(doctor))}</p>
            <p>患者：${doctor["患者数量"] ?? doctor.patient_count ?? 0} · 问诊：${doctor["问诊次数"] ?? doctor.consultation_count ?? 0} · 报告：${doctor["报告数量"] ?? doctor.ai_report_count ?? 0}</p>
            <p>最近问诊：${formatDateTime(doctor["最近问诊时间"] || doctor.last_consultation_time)}</p>
          </div>
          <div class="row-actions doctor-row-actions">
            <button class="ghost-btn" type="button" onclick="selectDoctor(${id})">查看患者</button>
            <button class="ghost-btn" type="button" onclick="editDoctor(${id})">编辑</button>
            <button class="ghost-btn" type="button" onclick="resetDoctorPassword(${id})">重置密码</button>
            <button class="${isActive ? "danger-btn" : "ghost-btn"}" type="button" onclick="toggleDoctorStatus(${id})">${isActive ? "禁用" : "启用"}</button>
          </div>
        </div>
      `;
    })
    .join("");
}

window.editDoctor = async function editDoctor(id) {
  const doctor = state.doctors.find((item) => getDoctorId(item) === id);
  if (!doctor) {
    toast("未找到医生信息");
    return;
  }

  const username = window.prompt("请输入医生用户名", getDoctorUsername(doctor));
  if (username === null) return;
  const normalizedUsername = username.trim();
  if (!normalizedUsername) {
    toast("用户名不能为空");
    return;
  }

  const realName = window.prompt("请输入医生姓名，可留空", doctor["医生姓名"] || doctor.real_name || "");
  if (realName === null) return;

  try {
    await request(`/admin/doctors/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        用户名: normalizedUsername,
        医生姓名: realName.trim() || null,
      }),
    });
    toast("医生信息已更新");
    await refreshDoctorManagement(true);
  } catch (error) {
    toast(error.message);
  }
};

window.resetDoctorPassword = async function resetDoctorPassword(id) {
  const doctor = state.doctors.find((item) => getDoctorId(item) === id);
  if (!doctor) {
    toast("未找到医生信息");
    return;
  }

  const password = window.prompt(`请输入 ${getDoctorName(doctor)} 的新密码`);
  if (password === null) return;
  const normalizedPassword = password.trim();
  if (!normalizedPassword) {
    toast("新密码不能为空");
    return;
  }

  try {
    await request(`/admin/doctors/${id}/password`, {
      method: "PUT",
      body: JSON.stringify({
        新密码: normalizedPassword,
      }),
    });
    toast("医生密码已重置");
  } catch (error) {
    toast(error.message);
  }
};

window.toggleDoctorStatus = async function toggleDoctorStatus(id) {
  const doctor = state.doctors.find((item) => getDoctorId(item) === id);
  if (!doctor) {
    toast("未找到医生信息");
    return;
  }

  const isActive = getDoctorActive(doctor);
  const actionText = isActive ? "禁用" : "启用";
  if (!window.confirm(`确定${actionText}医生 ${getDoctorName(doctor)} 吗？`)) return;

  try {
    await request(`/admin/doctors/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({
        是否启用: !isActive,
      }),
    });
    toast(`医生账号已${actionText}`);
    await refreshDoctorManagement(true);
  } catch (error) {
    toast(error.message);
  }
};

window.openDoctorDetail = async function openDoctorDetail(id) {
  switchView("doctorData");
  await window.selectDoctor(id);
};

window.selectDoctor = async function selectDoctor(id) {
  const doctor = state.doctors.find((item) => getDoctorId(item) === id);
  state.selectedDoctor = doctor || null;
  state.selectedDoctorPatients = [];
  $("#doctorPatientTitle").textContent = `${doctor?.["医生姓名"] || doctor?.real_name || doctor?.username || "医生"} 的患者名单`;
  $("#doctorPatientHint").textContent = "点击患者查看问诊历史";
  $("#patientHistoryTitle").textContent = "患者问诊历史";
  $("#patientHistoryHint").textContent = "请选择患者";
  showLoading("#doctorPatientList");
  $("#patientHistoryList").innerHTML = "";

  try {
    const patients = await request(`/admin/doctors/${id}/patients`);
    state.selectedDoctorPatients = patients;
    renderDoctorPatients(patients);
  } catch (error) {
    toast(error.message);
  }
};

function renderDoctorPatients(patients) {
  const list = $("#doctorPatientList");
  if (!patients.length) {
    list.innerHTML = '<div class="report-empty">该医生暂无患者。</div>';
    return;
  }

  list.innerHTML = patients
    .map((patient) => {
      const id = patient["患者ID"] || patient.id;
      return `
        <div class="patient-row">
          <div>
            <strong>${escapeHtml(patient["姓名"] || patient.name || "未命名患者")}</strong>
            <p>${escapeHtml(patient["性别"] || patient.gender || "未填")} / ${escapeHtml(patient["年龄"] || patient.age || "未填")}岁 / ${escapeHtml(patient["电话"] || patient.phone || "未填电话")}</p>
            <p>问诊次数：${patient["问诊次数"] ?? patient.consultation_count ?? 0} · 最近问诊：${formatDateTime(patient["最近问诊时间"] || patient.last_consultation_time)}</p>
          </div>
          <div class="row-actions">
            <button class="ghost-btn" type="button" onclick="showPatientHistory(${id})">问诊历史</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function findPatientForHistory(patientId) {
  return (
    state.selectedDoctorPatients.find((item) => (item["患者ID"] || item.id) === patientId) ||
    state.patients.find((item) => (item["患者ID"] || item.id) === patientId) ||
    null
  );
}

window.showPatientHistory = async function showPatientHistory(patientId) {
  try {
    const consultations = await request(`/patients/${patientId}/consultations`);
    const patient = findPatientForHistory(patientId);
    const title = `${patient?.["姓名"] || patient?.name || `患者ID ${patientId}`} 的问诊历史`;
    const targetView = isAdmin() ? "doctorData" : "patientHistory";
    const titleEl = isAdmin() ? $("#patientHistoryTitle") : $("#doctorHistoryTitle");
    const hintEl = isAdmin() ? $("#patientHistoryHint") : $("#doctorHistoryHint");
    const selector = isAdmin() ? "#patientHistoryList" : "#doctorHistoryList";

    state.selectedHistoryPatient = patient || { id: patientId };
    state.historyConsultations = consultations;
    titleEl.textContent = title;
    hintEl.textContent = `${consultations.length} 条记录`;
    renderPatientHistory(consultations, selector);
    switchView(targetView);
  } catch (error) {
    toast(error.message);
  }
};

window.deleteConsultation = async function deleteConsultation(consultationId) {
  if (!window.confirm("确定删除这条问诊记录吗？对应的 AI 报告也会一起删除。")) return;

  try {
    await request(`/consultations/${consultationId}`, { method: "DELETE" });
    toast("问诊记录已删除");

    await loadPatients();
    if (isAdmin()) {
      await Promise.all([loadDashboardData(), loadDoctorData()]);
      if (state.selectedDoctor) {
        await window.selectDoctor(state.selectedDoctor["医生ID"] || state.selectedDoctor.doctor_id);
      }
    }

    if (state.selectedHistoryPatient) {
      const patientId = state.selectedHistoryPatient["患者ID"] || state.selectedHistoryPatient.id;
      if (patientId) {
        await window.showPatientHistory(patientId);
      }
    }
  } catch (error) {
    toast(error.message);
  }
};

function getPatientField(patient, chineseKey, englishKey, fallback = "未填写") {
  const value = patient?.[chineseKey] ?? patient?.[englishKey];
  return value === null || value === undefined || value === "" ? fallback : value;
}

function getConsultationField(consultation, chineseKey, englishKey, fallback = "未填写") {
  const value = consultation?.[chineseKey] ?? consultation?.[englishKey];
  return value === null || value === undefined || value === "" ? fallback : value;
}

function renderPatientDetailSummary(patient, consultations) {
  const name = getPatientField(patient, "姓名", "name", "患者详情");
  const gender = getPatientField(patient, "性别", "gender");
  const age = getPatientField(patient, "年龄", "age");
  const phone = getPatientField(patient, "电话", "phone");
  const address = getPatientField(patient, "地址", "address");
  const medicalHistory = getPatientField(patient, "既往病史", "medical_history", "无");
  const allergyHistory = getPatientField(patient, "过敏史", "allergy_history", "无");
  const reportCount = consultations.filter((item) => getReportText(item["AI报告"] || item.ai_report)).length;
  const latestTime = consultations[0] ? formatDateTime(consultations[0]["创建时间"] || consultations[0].created_at) : "暂无";

  return `
    <div class="patient-detail-card">
      <div class="patient-detail-main">
        <div>
          <h3>${escapeHtml(name)}</h3>
          <p>${escapeHtml(gender)} / ${escapeHtml(age)}岁 / ${escapeHtml(phone)}</p>
          <p>${escapeHtml(address)}</p>
        </div>
        <div class="patient-detail-stats">
          <div><span>问诊次数</span><strong>${consultations.length}</strong></div>
          <div><span>AI报告</span><strong>${reportCount}</strong></div>
          <div><span>最近问诊</span><strong>${escapeHtml(latestTime)}</strong></div>
        </div>
      </div>
      <div class="patient-detail-notes">
        <div><span>既往病史</span><p>${escapeHtml(medicalHistory)}</p></div>
        <div><span>过敏史</span><p>${escapeHtml(allergyHistory)}</p></div>
      </div>
    </div>
  `;
}

function renderPatientHistory(consultations, selector) {
  const list = $(selector);
  if (!list) return;
  const patient = state.selectedHistoryPatient;
  const summaryHtml = renderPatientDetailSummary(patient, consultations);

  if (!consultations.length) {
    list.classList.remove("history-timeline");
    list.innerHTML = `${summaryHtml}<div class="report-empty">该患者暂无问诊记录。</div>`;
    return;
  }

  list.classList.add("history-timeline");
  const timelineHtml = consultations
    .map((item, index) => {
      const consultationId = item["问诊ID"] || item.id;
      const report = item["AI报告"] || item.ai_report;
      const isRegenerating = state.regeneratingHistoryIndex === index;
      const isExpanded = state.expandedHistoryReportIndex === index;
      const hasReport = Boolean(getReportText(report));
      const visitNo = consultations.length - index;
      return `
        <div class="history-timeline-item">
          <div class="timeline-dot">${visitNo}</div>
          <div class="history-item">
            <div class="history-head">
              <div>
                <h4>第 ${visitNo} 次问诊</h4>
                <p class="history-meta">${formatDateTime(item["创建时间"] || item.created_at)} · ${hasReport ? "已生成 AI 报告" : "暂无 AI 报告"}</p>
              </div>
              <div class="row-actions">
                <button class="ghost-btn" type="button" onclick="toggleHistoryFullReport(${index})" ${hasReport ? "" : "disabled"}>${isExpanded ? "收起完整报告" : "查看完整报告"}</button>
                <button class="ghost-btn" type="button" onclick="copyHistoryReport(${index})">复制报告</button>
                <button class="ghost-btn" type="button" onclick="printHistoryReport(${index})">打印报告</button>
                <button class="ghost-btn" type="button" onclick="regenerateHistoryReport(${index})" ${isRegenerating ? "disabled" : ""}>${isRegenerating ? "生成中..." : "重新生成报告"}</button>
                <button class="danger-btn" type="button" onclick="deleteConsultation(${consultationId})">删除记录</button>
              </div>
            </div>
            <div class="history-field-grid">
              <div><span>主诉</span><p>${escapeHtml(getConsultationField(item, "主诉", "chief_complaint"))}</p></div>
              <div><span>症状</span><p>${escapeHtml(getConsultationField(item, "症状", "symptoms"))}</p></div>
              <div><span>现病史</span><p>${escapeHtml(getConsultationField(item, "现病史", "present_illness"))}</p></div>
              <div><span>既往史</span><p>${escapeHtml(getConsultationField(item, "既往史", "past_history"))}</p></div>
              <div class="wide-history-field"><span>检查结果</span><p>${escapeHtml(getConsultationField(item, "检查结果", "examination"))}</p></div>
            </div>
            <div class="history-report-preview">
              <div class="history-report-title">AI报告摘要</div>
              ${getReportPreviewHtml(report)}
            </div>
            ${isExpanded ? getFullReportHtml(report) : ""}
          </div>
        </div>
      `;
    })
    .join("");
  list.innerHTML = `${summaryHtml}<div class="history-timeline-list">${timelineHtml}</div>`;
}

window.toggleHistoryFullReport = function toggleHistoryFullReport(index) {
  const consultation = state.historyConsultations[index];
  const report = consultation?.["AI报告"] || consultation?.ai_report;
  if (!getReportText(report)) {
    toast("这条问诊还没有生成 AI 报告");
    return;
  }
  state.expandedHistoryReportIndex = state.expandedHistoryReportIndex === index ? null : index;
  renderPatientHistory(state.historyConsultations, isAdmin() ? "#patientHistoryList" : "#doctorHistoryList");
};

window.copyHistoryReport = function copyHistoryReport(index) {
  const consultation = state.historyConsultations[index];
  const report = consultation?.["AI报告"] || consultation?.ai_report;
  copyText(getReportText(report));
};

window.printHistoryReport = function printHistoryReport(index) {
  const consultation = state.historyConsultations[index];
  const report = consultation?.["AI报告"] || consultation?.ai_report;
  const patientName = state.selectedHistoryPatient?.["姓名"] || state.selectedHistoryPatient?.name || "患者";
  printText(`${patientName} AI辅助决策报告`, getReportText(report));
};

window.regenerateHistoryReport = async function regenerateHistoryReport(index) {
  const consultation = state.historyConsultations[index];
  const consultationId = consultation?.["问诊ID"] || consultation?.id;
  if (!consultationId) {
    toast("无法识别这条问诊记录");
    return;
  }
  if (state.regeneratingHistoryIndex !== null) return;

  state.regeneratingHistoryIndex = index;
  renderPatientHistory(state.historyConsultations, isAdmin() ? "#patientHistoryList" : "#doctorHistoryList");
  toast("正在重新生成该条历史报告");

  try {
    const report = await request(`/ai/decision/${consultationId}?force=true`, { method: "POST" });
    consultation["AI报告"] = report;
    consultation.ai_report = report;
    if (state.lastReportConsultationId === consultationId) {
      renderReport(report);
      state.clearReportOnNextOpen = false;
    }
    toast("历史报告已重新生成");
    await loadPatients();
    if (isAdmin()) {
      await loadDashboardData();
      await loadDoctorData();
    } else {
      await loadDoctorDashboardData();
    }
    if (state.selectedHistoryPatient) {
      const patientId = state.selectedHistoryPatient["患者ID"] || state.selectedHistoryPatient.id;
      if (patientId) {
        await window.showPatientHistory(patientId);
      }
    } else {
      renderPatientHistory(state.historyConsultations, isAdmin() ? "#patientHistoryList" : "#doctorHistoryList");
    }
  } catch (error) {
    toast(error.message);
  } finally {
    state.regeneratingHistoryIndex = null;
    renderPatientHistory(state.historyConsultations, isAdmin() ? "#patientHistoryList" : "#doctorHistoryList");
  }
};

function copyCurrentReport() {
  copyText(getReportText(state.lastReport));
}

function printCurrentReport() {
  const reportTime = $("#reportTime")?.textContent || "";
  const title = reportTime && reportTime !== "暂无报告" ? `AI辅助决策报告 - ${reportTime}` : "AI辅助决策报告";
  printText(title, getReportText(state.lastReport));
}

async function regenerateCurrentReport() {
  if (!state.lastReportConsultationId) {
    toast("暂无可重新生成的问诊记录");
    return;
  }
  if (state.isRegeneratingReport) return;

  state.isRegeneratingReport = true;
  updateReportActions();
  $("#reportContent").className = "report-empty";
  $("#reportContent").textContent = "正在重新生成 AI 报告，请稍候...";
  toast("正在重新生成 AI 报告");

  try {
    const report = await request(`/ai/decision/${state.lastReportConsultationId}?force=true`, { method: "POST" });
    state.clearReportOnNextOpen = false;
    renderReport(report);
    toast("AI报告已重新生成");
    await loadPatients();
    if (isAdmin()) {
      await loadDashboardData();
      await loadDoctorData();
    } else {
      await loadDoctorDashboardData();
    }
  } catch (error) {
    renderReport(state.lastReport);
    toast(error.message);
  } finally {
    state.isRegeneratingReport = false;
    updateReportActions();
  }
}

async function copyText(text) {
  if (!text) {
    toast("暂无可复制的报告");
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    toast("报告已复制");
  } catch (error) {
    toast("复制失败，请手动选择报告内容");
  }
}

function printText(title, text) {
  if (!text) {
    toast("暂无可打印的报告");
    return;
  }

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    toast("浏览器阻止了打印窗口，请允许弹窗后重试");
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: "Microsoft YaHei", Arial, sans-serif; margin: 32px; color: #1f2937; }
          h1 { font-size: 22px; margin: 0 0 16px; }
          pre { white-space: pre-wrap; line-height: 1.8; font-size: 14px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <pre>${escapeHtml(text)}</pre>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function switchView(target) {
  if (target === "doctorData" && !isAdmin()) target = "patients";
  if (target === "operationLogs" && !isAdmin()) target = "patients";
  if (target === "patientHistory" && isAdmin()) target = "doctorData";

  const currentView = document.querySelector(".view.active")?.id;
  if (currentView === "report" && target !== "report" && state.lastReport) {
    state.clearReportOnNextOpen = true;
  }
  if (target === "report" && state.clearReportOnNextOpen) {
    clearReport();
    state.clearReportOnNextOpen = false;
  }

  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === target);
  });
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.target === target);
  });

  const navTitle = document.querySelector(`[data-target="${target}"]`)?.textContent;
  if (target === "patientHistory") {
    $("#pageTitle").textContent = "患者历史详情";
  } else if (target === "doctorData" && isAdmin()) {
    $("#pageTitle").textContent = "医生管理";
  } else if (target === "dashboard" && isAdmin()) {
    $("#pageTitle").textContent = "管理看板";
  } else if (target === "operationLogs" && isAdmin()) {
    $("#pageTitle").textContent = "操作日志";
  } else if (target === "settings") {
    $("#pageTitle").textContent = "个人中心";
    renderSettings();
  } else {
    $("#pageTitle").textContent = navTitle || "工作台";
  }
}

async function refreshData() {
  try {
    await checkHealth();
    if (!state.currentUser) {
      toast("刷新成功");
      return;
    }

    const currentView = document.querySelector(".view.active")?.id || "dashboard";
    if (currentView === "settings") {
      await loadCurrentUser();
      toast("刷新成功");
      return;
    }
    if (currentView === "operationLogs") {
      await loadOperationLogs(state.operationLogs.page);
      toast("刷新成功");
      return;
    }

    await loadPatients();

    if (isAdmin()) {
      if (currentView === "dashboard") {
        await loadDashboardData();
      }
      if (currentView === "doctorData") {
        await loadDoctorData();
        if (state.selectedDoctor) {
          await window.selectDoctor(state.selectedDoctor["医生ID"] || state.selectedDoctor.doctor_id);
        }
      }
    } else if (currentView === "dashboard") {
      await loadDoctorDashboardData();
    }

    if (currentView === "patientHistory" && state.selectedHistoryPatient) {
      await window.showPatientHistory(state.selectedHistoryPatient["患者ID"] || state.selectedHistoryPatient.id);
    }
    toast("刷新成功");
  } catch (error) {
    toast(error.message || "刷新失败，请确认后端已启动");
  }
}

async function init() {
  updateLoginState();
  await checkHealth();
  if (!state.currentUser) return;

  try {
    await loadPatients();
    if (isAdmin()) {
      syncDoctorFiltersToInputs();
      await Promise.all([loadDashboardData(), loadDoctorData()]);
      switchView("dashboard");
    } else {
      await loadDoctorDashboardData();
    }
  } catch (error) {
    toast(error.message || "数据加载失败，请确认后端已启动");
  }
}

function resetDoctorFilters() {
  state.doctorStatsFilters = {
    keyword: "",
    sortBy: "consultation_count",
    sortOrder: "desc",
  };
  syncDoctorFiltersToInputs();
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", async () => {
      switchView(item.dataset.target);
      if (item.dataset.target === "dashboard" && isAdmin() && !state.dashboardStats) {
        await loadDashboardData();
      }
      if (item.dataset.target === "dashboard" && !isAdmin()) {
        await loadDoctorDashboardData();
      }
      if (item.dataset.target === "doctorData" && isAdmin() && !state.doctors.length) {
        await loadDoctorData();
      }
      if (item.dataset.target === "operationLogs" && isAdmin()) {
        await loadOperationLogs(1);
      }
      if (item.dataset.target === "settings" && state.currentUser) {
        await loadCurrentUser();
      }
    });
  });
  document.querySelectorAll(".quick-action").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.target));
  });
  document.querySelectorAll("[data-export-type]").forEach((button) => {
    button.addEventListener("click", () => downloadAdminExport(button.dataset.exportType));
  });
  $("#refreshBtn").addEventListener("click", refreshData);
  $("#loginForm").addEventListener("submit", login);
  $("#loginUsername").addEventListener("input", () => setLoginError());
  $("#loginPassword").addEventListener("input", () => setLoginError());
  $("#logoutBtn").addEventListener("click", () => logout(true));
  $("#doctorCreateForm")?.addEventListener("submit", createDoctor);
  $("#profileForm")?.addEventListener("submit", saveProfile);
  $("#passwordForm")?.addEventListener("submit", changePassword);
  $("#resetPatientBtn").addEventListener("click", resetPatientForm);
  $("#patientForm").addEventListener("submit", savePatient);
  $("#consultationForm").addEventListener("submit", saveConsultation);
  $("#copyReportBtn").addEventListener("click", copyCurrentReport);
  $("#printReportBtn").addEventListener("click", printCurrentReport);
  $("#regenerateReportBtn").addEventListener("click", regenerateCurrentReport);
  $("#doctorFilterBtn").addEventListener("click", async () => {
    await loadDoctorData();
  });
  $("#doctorFilterResetBtn").addEventListener("click", async () => {
    resetDoctorFilters();
    await loadDoctorData();
  });
  $("#doctorSortBy").addEventListener("change", loadDoctorData);
  $("#doctorSortOrder").addEventListener("change", loadDoctorData);
  $("#operationLogSearchBtn")?.addEventListener("click", async () => {
    state.operationLogs.page = 1;
    await loadOperationLogs(1);
  });
  $("#operationLogResetBtn")?.addEventListener("click", async () => {
    resetOperationLogFilters();
    await loadOperationLogs(1);
  });
  $("#operationLogPrevBtn")?.addEventListener("click", async () => {
    if (state.operationLogs.page > 1) {
      await loadOperationLogs(state.operationLogs.page - 1);
    }
  });
  $("#operationLogNextBtn")?.addEventListener("click", async () => {
    const totalPages = Math.max(1, Math.ceil(state.operationLogs.total / state.operationLogs.pageSize));
    if (state.operationLogs.page < totalPages) {
      await loadOperationLogs(state.operationLogs.page + 1);
    }
  });
  $("#operationLogKeyword")?.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      state.operationLogs.page = 1;
      await loadOperationLogs(1);
    }
  });
  $("#doctorSearch").addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await loadDoctorData();
    }
  });
}

bindEvents();
renderAdminDashboard();
clearReport();
init();
