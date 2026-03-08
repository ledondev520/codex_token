const { loadSnapshot } = require("./usageRepository");

function createLiveSnapshotService(options = {}) {
  const listeners = new Set();
  const refreshIntervalMs = options.refreshIntervalMs || 5000;
  let timer = null;
  let latestSnapshotPromise = null;
  let latestSnapshot = null;
  let fullRefreshStarted = false;

  function createPlaceholderSnapshot() {
    return {
      generatedAt: new Date().toISOString(),
      sources: {
        codexHome: options.codexHome || process.env.CODEX_HOME || null,
      },
      overview: {
        totalThreads: 0,
        totalTokens: 0,
        latestUpdatedAt: null,
        totalEstimatedCost: 0,
      },
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
      loading: true,
    };
  }

  async function loadFastSnapshot() {
    const snapshot = await loadSnapshot({
      ...options,
      skipSessionParsing: true,
    });
    latestSnapshot = { ...snapshot, loading: true };
    return snapshot;
  }

  async function refresh() {
    latestSnapshotPromise = loadSnapshot({
      ...options,
      recentSessionFileLimit: options.recentSessionFileLimit || 40,
      ledgerFileLimit: options.ledgerFileLimit || 217,
    });
    const snapshot = await latestSnapshotPromise;
    latestSnapshot = { ...snapshot, loading: false };

    for (const listener of listeners) {
      listener(latestSnapshot);
    }

    return latestSnapshot;
  }

  function primeSnapshots() {
    if (!latestSnapshotPromise) {
      latestSnapshotPromise = loadFastSnapshot().catch(() => {
        latestSnapshot = createPlaceholderSnapshot();
        return latestSnapshot;
      });
    }

    if (!fullRefreshStarted) {
      fullRefreshStarted = true;
      refresh().catch(() => {});
    }
  }

  function subscribe(listener) {
    listeners.add(listener);

    if (latestSnapshot) {
      listener(latestSnapshot);
    }
    primeSnapshots();

    if (!timer) {
      timer = setInterval(() => {
        refresh().catch(() => {});
      }, refreshIntervalMs);
    }

    return () => {
      listeners.delete(listener);
      if (!listeners.size && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }

  return {
    refresh,
    subscribe,
    primeSnapshots,
    getCurrentSnapshot: () => {
      primeSnapshots();
      return latestSnapshot || createPlaceholderSnapshot();
    },
  };
}

module.exports = {
  createLiveSnapshotService,
};
