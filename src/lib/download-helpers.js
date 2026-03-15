export function triggerCsvDownload(filename, csv) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
  return true;
}

export function triggerJsonDownload(filename, payload) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
  return true;
}
