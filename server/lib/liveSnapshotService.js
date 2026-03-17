const { loadSnapshot } = require("./usageRepository");
const { loadSnapshotInBackground } = require("./loadSnapshotChild");

function createLiveSnapshotService(options = {}) {
  const listeners = new Set();
  const runtimeOptions = { ...options };
  const loadSnapshotFn = runtimeOptions.loadSnapshotFn || loadSnapshot;
  const loadSnapshotInBackgroundFn =
    runtimeOptions.loadSnapshotInBackgroundFn || loadSnapshotInBackground;
  const refreshIntervalMs = runtimeOptions.refreshIntervalMs || 5000;
  let timer = null;
  let latestSnapshotPromise = null;
  let latestSnapshot = createPlaceholderSnapshot();
  let warmupScheduled = false;
  let fullRefreshScheduled = false;
  let snapshotGeneration = 0;

  function createPlaceholderSnapshot() {
    return {
      generatedAt: new Date().toISOString(),
      sources: {
        codexHome: runtimeOptions.codexHome || process.env.CODEX_HOME || null,
      },
      overview: {
        totalThreads: 0,
        totalTokens: 0,
        latestUpdatedAt: null,
        totalEstimatedCost: 0,
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
      loading: true,
    };
  }

  function emitSnapshot(snapshot) {
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  async function loadFastSnapshot(generation = snapshotGeneration) {
    const snapshot = await loadSnapshotFn({
      ...runtimeOptions,
      skipSessionParsing: true,
    });
    if (generation !== snapshotGeneration) {
      return latestSnapshot;
    }

    latestSnapshot = { ...snapshot, loading: true };
    emitSnapshot(latestSnapshot);
    return latestSnapshot;
  }

  async function refresh(generation = snapshotGeneration) {
    if (latestSnapshotPromise) {
      return latestSnapshotPromise;
    }

    latestSnapshotPromise = (async () => {
      const snapshot = await loadSnapshotInBackgroundFn({
        ...runtimeOptions,
        recentSessionFileLimit: runtimeOptions.recentSessionFileLimit || 40,
        ledgerFileLimit: runtimeOptions.ledgerFileLimit || 217,
      });
      if (generation !== snapshotGeneration) {
        return latestSnapshot;
      }

      latestSnapshot = { ...snapshot, loading: false };
      emitSnapshot(latestSnapshot);
      return latestSnapshot;
    })();

    try {
      return await latestSnapshotPromise;
    } finally {
      latestSnapshotPromise = null;
      fullRefreshScheduled = false;
    }
  }

  function scheduleBackgroundRefresh(generation = snapshotGeneration) {
    if (fullRefreshScheduled) {
      return;
    }

    fullRefreshScheduled = true;
    setTimeout(() => {
      refresh(generation).catch(() => {});
    }, 0);
  }

  function primeSnapshots() {
    if (warmupScheduled) {
      return;
    }

    warmupScheduled = true;
    latestSnapshot = latestSnapshot || createPlaceholderSnapshot();

    const generation = snapshotGeneration;

    setTimeout(async () => {
      try {
        latestSnapshotPromise = loadFastSnapshot(generation);
        await latestSnapshotPromise;
      } catch {
        if (generation === snapshotGeneration) {
          latestSnapshot = createPlaceholderSnapshot();
        }
      } finally {
        latestSnapshotPromise = null;
        scheduleBackgroundRefresh(generation);
      }
    }, 0);
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

  async function setCodexHome(codexHome) {
    snapshotGeneration += 1;
    runtimeOptions.codexHome = codexHome;
    latestSnapshotPromise = null;
    latestSnapshot = createPlaceholderSnapshot();
    warmupScheduled = false;
    fullRefreshScheduled = false;
    primeSnapshots();
    return refresh();
  }

  return {
    refresh,
    setCodexHome,
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
