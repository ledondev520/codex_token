const fs = require("node:fs");
const path = require("node:path");

function createEmptySnapshot() {
  return {
    generatedAt: new Date().toISOString(),
    sources: {
      codexHome: "remote-upload",
      stateDbPath: null,
      sessionsDir: null,
      archivedSessionsDir: null,
      mode: "remote-upload",
    },
    overview: {
      totalThreads: 0,
      totalTokens: 0,
      latestUpdatedAt: null,
      totalEstimatedCost: 0,
    },
    decision: {
      projectCost: { today: [], last7Days: [], note: "" },
      modelCost: { today: [], last7Days: [], note: "" },
      efficiency: {
        today: {
          totalUsd: 0,
          totalTokens: 0,
          inputTokens: 0,
          cachedInputTokens: 0,
          successCount: 0,
          failureCount: 0,
          terminalCount: 0,
          costPer1kTokens: null,
          cacheHitRate: null,
          successRate: null,
        },
        last7Days: {
          totalUsd: 0,
          totalTokens: 0,
          inputTokens: 0,
          cachedInputTokens: 0,
          successCount: 0,
          failureCount: 0,
          terminalCount: 0,
          costPer1kTokens: null,
          cacheHitRate: null,
          successRate: null,
        },
        costPer1kNote: "",
        cacheHitRateNote: "",
        successRateNote: "",
      },
      failures: {
        todayCount: 0,
        last7DaysCount: 0,
        latestFailedAt: null,
        recent: [],
        note: "",
      },
    },
    openclaw: null,
    dailyLedger: [],
    pricingCatalog: [],
    live: {
      currentSession: null,
      rateLimits: null,
      latestEventAt: null,
      latestEventFile: null,
      latestRateLimitAt: null,
      latestRateLimitFile: null,
    },
    recentThreads: [],
    dailyUsage: [],
    loading: false,
  };
}

function normalizeUploadedSnapshot(snapshot) {
  const empty = createEmptySnapshot();
  return {
    ...empty,
    ...snapshot,
    sources: {
      ...empty.sources,
      ...(snapshot?.sources || {}),
      mode: "remote-upload",
    },
    overview: {
      ...empty.overview,
      ...(snapshot?.overview || {}),
    },
    decision: snapshot?.decision || empty.decision,
    live: {
      ...empty.live,
      ...(snapshot?.live || {}),
    },
    recentThreads: Array.isArray(snapshot?.recentThreads) ? snapshot.recentThreads : [],
    dailyLedger: Array.isArray(snapshot?.dailyLedger) ? snapshot.dailyLedger : [],
    pricingCatalog: Array.isArray(snapshot?.pricingCatalog) ? snapshot.pricingCatalog : [],
    dailyUsage: Array.isArray(snapshot?.dailyUsage) ? snapshot.dailyUsage : [],
    loading: false,
  };
}

function buildUploadedSnapshot(snapshot, options = {}) {
  const recentThreadsLimit = Number(options.recentThreadsLimit || 120);
  const dailyLedgerLimit = Number(options.dailyLedgerLimit || 60);
  const dailyUsageLimit = Number(options.dailyUsageLimit || 60);

  return normalizeUploadedSnapshot({
    generatedAt: snapshot?.generatedAt || new Date().toISOString(),
    sources: {
      codexHome: "remote-upload",
      stateDbPath: null,
      sessionsDir: null,
      archivedSessionsDir: null,
      mode: "remote-upload",
    },
    overview: snapshot?.overview || {},
    decision: snapshot?.decision || null,
    openclaw: snapshot?.openclaw
      ? {
          provider: snapshot.openclaw.provider || null,
          source: snapshot.openclaw.source || null,
          updatedAt: snapshot.openclaw.updatedAt || null,
          session: snapshot.openclaw.session || null,
          totals: snapshot.openclaw.totals || null,
          daily: Array.isArray(snapshot.openclaw.daily)
            ? snapshot.openclaw.daily.slice(0, dailyUsageLimit)
            : [],
          topModels: Array.isArray(snapshot.openclaw.topModels)
            ? snapshot.openclaw.topModels
            : [],
        }
      : null,
    dailyLedger: Array.isArray(snapshot?.dailyLedger)
      ? snapshot.dailyLedger.slice(0, dailyLedgerLimit)
      : [],
    pricingCatalog: Array.isArray(snapshot?.pricingCatalog) ? snapshot.pricingCatalog : [],
    live: snapshot?.live
      ? {
          ...snapshot.live,
          latestEventFile: null,
          latestRateLimitFile: null,
          currentSession: snapshot.live.currentSession
            ? {
                ...snapshot.live.currentSession,
                title: snapshot.live.currentSession.titlePreview || snapshot.live.currentSession.title || "当前会话",
                titlePreview:
                  snapshot.live.currentSession.titlePreview ||
                  snapshot.live.currentSession.title ||
                  "当前会话",
              }
            : null,
        }
      : null,
    recentThreads: Array.isArray(snapshot?.recentThreads)
      ? snapshot.recentThreads.slice(0, recentThreadsLimit).map((row) => ({
          id: row.id,
          source: row.source || null,
          title: row.titlePreview || row.title || row.id || "(untitled)",
          titlePreview: row.titlePreview || row.title || row.id || "(untitled)",
          cwd: null,
          workspaceLabel: row.workspaceLabel || "-",
          modelProvider: row.modelProvider || null,
          tokensUsed: row.tokensUsed || 0,
          createdAt: row.createdAt || null,
          updatedAt: row.updatedAt || null,
          usageOrigin: row.usageOrigin || "codex-local",
          usageOriginLabel: row.usageOriginLabel || "",
          usageOriginDescription: row.usageOriginDescription || "",
          modelName: row.modelName || null,
          promptText: null,
          userMessages: [],
          statusLabel: row.statusLabel || "未知",
          tokenUsage: row.tokenUsage || null,
          cost: row.cost || null,
        }))
      : [],
    dailyUsage: Array.isArray(snapshot?.dailyUsage)
      ? snapshot.dailyUsage.slice(0, dailyUsageLimit)
      : [],
    loading: false,
  });
}

function createRemoteSnapshotService(options = {}) {
  const listeners = new Set();
  const snapshotFilePath = path.resolve(options.snapshotFilePath);
  let latestSnapshot = createEmptySnapshot();

  function emitSnapshot(snapshot) {
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function readSnapshotFromDisk() {
    if (!fs.existsSync(snapshotFilePath)) {
      latestSnapshot = createEmptySnapshot();
      return latestSnapshot;
    }

    const raw = fs.readFileSync(snapshotFilePath, "utf8");
    latestSnapshot = normalizeUploadedSnapshot(JSON.parse(raw));
    return latestSnapshot;
  }

  function writeSnapshotToDisk(snapshot) {
    fs.mkdirSync(path.dirname(snapshotFilePath), { recursive: true });
    const tempFilePath = `${snapshotFilePath}.tmp`;
    fs.writeFileSync(tempFilePath, JSON.stringify(normalizeUploadedSnapshot(snapshot)));
    fs.renameSync(tempFilePath, snapshotFilePath);
  }

  async function refresh() {
    const snapshot = readSnapshotFromDisk();
    emitSnapshot(snapshot);
    return snapshot;
  }

  async function setUploadedSnapshot(snapshot) {
    const normalized = normalizeUploadedSnapshot(snapshot);
    writeSnapshotToDisk(normalized);
    latestSnapshot = normalized;
    emitSnapshot(latestSnapshot);
    return latestSnapshot;
  }

  function primeSnapshots() {
    readSnapshotFromDisk();
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(latestSnapshot);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    refresh,
    setUploadedSnapshot,
    subscribe,
    primeSnapshots,
    getCurrentSnapshot: () => latestSnapshot,
  };
}

module.exports = {
  buildUploadedSnapshot,
  createRemoteSnapshotService,
  normalizeUploadedSnapshot,
};
