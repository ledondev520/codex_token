const { loadSnapshot } = require("./usageRepository");

function createLiveSnapshotService(options = {}) {
  const listeners = new Set();
  const refreshIntervalMs = options.refreshIntervalMs || 5000;
  let timer = null;
  let latestSnapshotPromise = null;

  async function refresh() {
    latestSnapshotPromise = loadSnapshot(options);
    const snapshot = await latestSnapshotPromise;

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
        latestSnapshotPromise = loadSnapshot(options);
      }

      return latestSnapshotPromise;
    },
  };
}

module.exports = {
  createLiveSnapshotService,
};
