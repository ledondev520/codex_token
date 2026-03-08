const { loadSnapshot } = require("./usageRepository");

function createLiveSnapshotService(options = {}) {
  const listeners = new Set();
  const refreshIntervalMs = options.refreshIntervalMs || 5000;
  let timer = null;
  let latestSnapshotPromise = null;
  let latestSnapshot = null;
  let fullRefreshStarted = false;

  async function loadFastSnapshot() {
    const snapshot = await loadSnapshot({
      ...options,
      recentSessionFileLimit: options.recentSessionFileLimit || 12,
      ledgerFileLimit: options.ledgerFileLimit || 36,
    });
    latestSnapshot = snapshot;
    return snapshot;
  }

  async function refresh() {
    latestSnapshotPromise = loadSnapshot({
      ...options,
      recentSessionFileLimit: options.recentSessionFileLimit || 40,
      ledgerFileLimit: options.ledgerFileLimit || 217,
    });
    const snapshot = await latestSnapshotPromise;
    latestSnapshot = snapshot;

    for (const listener of listeners) {
      listener(snapshot);
    }

    return snapshot;
  }

  function subscribe(listener) {
    listeners.add(listener);

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
    getLatestSnapshot: async () => {
      if (!latestSnapshotPromise) {
        latestSnapshotPromise = loadFastSnapshot();
      }

      const snapshot = await latestSnapshotPromise;

      if (!fullRefreshStarted) {
        fullRefreshStarted = true;
        refresh().catch(() => {});
      }

      return latestSnapshot || snapshot;
    },
  };
}

module.exports = {
  createLiveSnapshotService,
};
