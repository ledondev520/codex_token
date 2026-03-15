export function connectionBadgeVariant(label) {
  if (label.includes("失败")) {
    return "danger";
  }

  if (label.includes("重连")) {
    return "warning";
  }

  return "info";
}

export function originBadgeVariant(origin) {
  return origin === "openclaw-oauth" ? "teal" : "info";
}

export function statusBadgeVariant(label) {
  if (label === "进行中") {
    return "warning";
  }

  if (label === "已完结") {
    return "success";
  }

  if (label === "已中断") {
    return "danger";
  }

  return "secondary";
}

export function alertPhaseBadgeVariant(phase) {
  if (phase === "triggered") {
    return "danger";
  }

  if (phase === "recovered") {
    return "success";
  }

  if (phase === "disabled") {
    return "secondary";
  }

  return "info";
}

export function alertPhaseLabel(phase) {
  if (phase === "triggered") {
    return "触发中";
  }

  if (phase === "recovered") {
    return "已恢复";
  }

  if (phase === "disabled") {
    return "已关闭";
  }

  return "正常";
}

export function formatAlertTimestamp(value) {
  if (!value) {
    return "暂无变化";
  }

  return new Date(value).toLocaleString("zh-CN");
}

export function refreshStatusVariant(status) {
  if (status === "success") {
    return "success";
  }

  if (status === "error") {
    return "danger";
  }

  if (status === "loading") {
    return "warning";
  }

  return "secondary";
}

export function refreshStatusLabel(status) {
  if (status === "success") {
    return "刷新成功";
  }

  if (status === "error") {
    return "刷新失败";
  }

  if (status === "loading") {
    return "刷新进行中";
  }

  return "等待刷新";
}

export function resolveFreshnessState(generatedAt, now = Date.now()) {
  const generatedAtMs = new Date(generatedAt || 0).getTime();
  const nowMs = new Date(now).getTime();

  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(nowMs)) {
    return { label: "未知", variant: "secondary" };
  }

  const ageMinutes = Math.max(0, (nowMs - generatedAtMs) / 60000);
  if (ageMinutes <= 2) {
    return { label: "新鲜", variant: "success" };
  }

  if (ageMinutes <= 10) {
    return { label: "正常", variant: "info" };
  }

  if (ageMinutes <= 30) {
    return { label: "延迟", variant: "warning" };
  }

  return { label: "陈旧", variant: "danger" };
}

export function ledgerStateVariant(stateLabel) {
  if (String(stateLabel || "").includes("异常")) {
    return "danger";
  }

  if (String(stateLabel || "").includes("运行")) {
    return "warning";
  }

  return "secondary";
}

export function getLedgerOriginLabel(origin) {
  return origin === "openclaw-oauth" ? "小龙虾主脑" : "Codex 编程";
}
