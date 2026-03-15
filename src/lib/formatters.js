export function formatLocalDateLabel(value) {
  if (!value) {
    return "选择日期";
  }

  return value;
}

export function parseDateValue(value) {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

export function formatDateValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateRangeLabel(range) {
  if (!range?.startDay && !range?.endDay) {
    return "全部时间";
  }

  if (range?.startDay && range?.endDay) {
    return `${range.startDay} -> ${range.endDay}`;
  }

  return range?.startDay || range?.endDay || "全部时间";
}

export function formatUsdPerThousandTokens(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }

  if (Math.abs(numeric) >= 1) {
    return `$${numeric.toFixed(2)}`;
  }

  if (Math.abs(numeric) >= 0.01) {
    return `$${numeric.toFixed(3)}`;
  }

  return `$${numeric.toFixed(4)}`;
}

export function formatDecisionPercent(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }

  return `${numeric.toFixed(1).replace(/\.0$/, "")}%`;
}

export function formatCompactDateTime(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
