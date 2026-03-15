import { useState, useEffect } from "react";

export const INITIAL_SNAPSHOT =
  typeof window !== "undefined" && window.__INITIAL_SNAPSHOT__
    ? window.__INITIAL_SNAPSHOT__
    : null;

export const EMPTY_SNAPSHOT = {
  generatedAt: new Date().toISOString(),
  sources: {
    codexHome: "",
  },
  overview: {
    totalThreads: 0,
    totalTokens: 0,
    totalEstimatedCost: 0,
  },
  decision: {
    projectCost: {
      today: [],
      last7Days: [],
      note: "",
    },
    modelCost: {
      today: [],
      last7Days: [],
      note: "",
    },
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
  live: {
    currentSession: null,
    rateLimits: null,
    latestRateLimitAt: null,
  },
  recentThreads: [],
  dailyLedger: [],
  pricingCatalog: [],
  loading: true,
};

export function useDashboardSnapshot() {
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT || EMPTY_SNAPSHOT);
  const [connectionLabel, setConnectionLabel] = useState(
    INITIAL_SNAPSHOT?.loading ? "连接中" : INITIAL_SNAPSHOT ? "实时中" : "连接中"
  );

  useEffect(() => {
    let source;
    let cancelled = false;

    async function fetchSnapshot() {
      const response = await fetch("/api/snapshot");
      if (!response.ok) {
        throw new Error(`snapshot request failed: ${response.status}`);
      }

      const data = await response.json();
      if (!cancelled) {
        setSnapshot(data);
      }
    }

    fetchSnapshot()
      .then(() => {
        if (!cancelled) {
          setConnectionLabel("实时中");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConnectionLabel("读取失败");
        }
      });

    if ("EventSource" in window) {
      source = new EventSource("/api/stream");
      source.addEventListener("snapshot", (event) => {
        if (cancelled) {
          return;
        }

        setSnapshot(JSON.parse(event.data));
        setConnectionLabel("实时流");
      });

      source.onerror = () => {
        if (!cancelled) {
          setConnectionLabel("重连中");
        }
      };
    }

    return () => {
      cancelled = true;
      source?.close();
    };
  }, []);

  return {
    snapshot,
    setSnapshot,
    connectionLabel,
    setConnectionLabel,
  };
}
