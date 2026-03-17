import { useState, useEffect, useMemo } from "react";
import { Button } from "./components/ui/button.jsx";
import { Badge } from "./components/ui/badge.jsx";
import { PageHeader } from "./components/dashboard/page-header.jsx";

import { AccessGate } from "./components/dashboard/AccessGate.jsx";
import { CodexDashboard } from "./components/dashboard/CodexDashboard.jsx";
import { PricingSettingsPage } from "./components/dashboard/PricingSettingsPage.jsx";
import { useDashboardSnapshot } from "./hooks/useDashboardSnapshot.js";

import { readAlertConfig, persistAlertConfig, readAlertStates, persistAlertStates, readAccessState, persistAccessState, ACCESS_PASSWORD } from "./lib/storage.js";
import { formatRelativeTime, getAlertMetrics, evaluateAlertStates, normalizeAlertConfig } from "./lib/dashboard-logic.mjs";

const APP_ROUTES = {
  home: "/",
  pricing: "/settings/pricing",
};

function readCurrentPage() {
  if (typeof window === "undefined") {
    return "home";
  }

  return window.location.pathname === APP_ROUTES.pricing ? "pricing" : "home";
}

export default function App() {
  const { snapshot, setSnapshot, connectionLabel, setConnectionLabel } = useDashboardSnapshot();
  const [currentPage, setCurrentPage] = useState(() => readCurrentPage());
  const [codexHomeInput, setCodexHomeInput] = useState("");
  const [refreshStatus, setRefreshStatus] = useState("idle");
  const [refreshMessage, setRefreshMessage] = useState("");
  const [isAccessGranted, setIsAccessGranted] = useState(() => readAccessState());
  const [accessPassword, setAccessPassword] = useState("");
  const [accessError, setAccessError] = useState("");
  const [alertConfig, setAlertConfig] = useState(() => readAlertConfig());
  const [alertStates, setAlertStates] = useState(() => readAlertStates());
  const alertMetrics = useMemo(() => getAlertMetrics(snapshot), [snapshot]);

  useEffect(() => {
    setCodexHomeInput(snapshot.sources?.codexHome || "");
  }, [snapshot.sources?.codexHome]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const syncPage = () => setCurrentPage(readCurrentPage());
    window.addEventListener("popstate", syncPage);
    return () => window.removeEventListener("popstate", syncPage);
  }, []);

  useEffect(() => {
    persistAlertConfig(alertConfig);
  }, [alertConfig]);

  useEffect(() => {
    setAlertStates((current) => {
      const next = evaluateAlertStates({
        metrics: alertMetrics,
        config: alertConfig,
        previousStates: current,
        timestamp: snapshot.generatedAt,
      });

      if (JSON.stringify(current) === JSON.stringify(next)) {
        return current;
      }

      persistAlertStates(next);
      return next;
    });
  }, [alertConfig, alertMetrics, snapshot.generatedAt]);

  function handleAccessSubmit(event) {
    event.preventDefault();

    if (accessPassword === ACCESS_PASSWORD) {
      persistAccessState(true);
      setIsAccessGranted(true);
      setAccessPassword("");
      setAccessError("");
      return;
    }

    setAccessError("密码错误，请重试。");
  }

  function handleRelock() {
    persistAccessState(false);
    setIsAccessGranted(false);
    setAccessPassword("");
    setAccessError("");
  }

  function navigateTo(route) {
    if (typeof window !== "undefined" && window.location.pathname !== route) {
      window.history.pushState({}, "", route);
    }
    setCurrentPage(readCurrentPage());
  }

  async function updateSource(nextCodexHome) {
    const response = await fetch("/api/source", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ codexHome: nextCodexHome }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "更新数据目录失败");
    }

    setSnapshot(payload);
    setConnectionLabel("实时中");
  }

  async function handleRefreshSnapshot() {
    setRefreshStatus("loading");
    setRefreshMessage("");

    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "刷新失败");
      }

      setSnapshot(payload);
      setConnectionLabel("实时中");
      setRefreshStatus("success");
      setRefreshMessage(`最近刷新 ${new Date(payload.generatedAt).toLocaleString("zh-CN")}`);
    } catch (error) {
      setRefreshStatus("error");
      setRefreshMessage(error instanceof Error ? error.message : "刷新失败");
    }
  }

  function handleAlertRuleChange(ruleKey, updates) {
    setAlertConfig((current) =>
      normalizeAlertConfig({
        ...current,
        [ruleKey]: {
          ...current[ruleKey],
          ...updates,
        },
      })
    );
  }

  if (!isAccessGranted) {
    return (
      <AccessGate
        password={accessPassword}
        errorMessage={accessError}
        onPasswordChange={(value) => {
          setAccessPassword(value);
          if (accessError) {
            setAccessError("");
          }
        }}
        onSubmit={handleAccessSubmit}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1520px] space-y-4 px-3 py-4 sm:px-4 md:px-6 lg:px-8 lg:py-6 transition-all duration-300">
      <PageHeader
        title="Codex 用量统计"
        description="拆开看两笔账：你直接使用 Codex 的消耗，以及小龙虾主脑自身消耗加代跑 Codex 的总账。"
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Badge variant="outline" className="px-3 py-1 text-xs text-muted-foreground bg-muted/20 border-border/50 shadow-sm hidden sm:inline-flex">
              最近同步 <span className="text-foreground ml-1.5 font-medium">{formatRelativeTime(snapshot.generatedAt)}</span>
            </Badge>
            <Badge variant={
              alertStates.dailySpend?.phase === "triggered" ||
              alertStates.failureRate?.phase === "triggered" ||
              (snapshot.live.rateLimits && snapshot.live.latestRateLimitAt && new Date(snapshot.live.latestRateLimitAt).getTime() <= new Date(snapshot.generatedAt).getTime())
                ? "destructive"
                : "secondary"
            } className="px-3 py-1 shadow-sm font-medium">
              {alertStates.dailySpend?.phase === "triggered" ||
              alertStates.failureRate?.phase === "triggered" ||
              (snapshot.live.rateLimits && snapshot.live.latestRateLimitAt && new Date(snapshot.live.latestRateLimitAt).getTime() <= new Date(snapshot.generatedAt).getTime())
                ? "异常监控告警"
                : "全链路监控正常"}
            </Badge>
            {refreshStatus === "loading" ? (
              <Badge variant="warning" className="px-3 py-1 shadow-sm font-medium animate-pulse">后台同步中</Badge>
            ) : null}
            <Button type="button" size="sm" onClick={handleRefreshSnapshot} disabled={refreshStatus === "loading"} className="shadow-sm">
              {refreshStatus === "loading" ? "同步中..." : "立刻刷新数据"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleRelock} className="shadow-sm border-border/60">
              重新锁定
            </Button>
          </div>
        }
      />

      {currentPage === "pricing" ? (
        <PricingSettingsPage
          snapshot={snapshot}
          refreshStatus={refreshStatus}
          refreshMessage={refreshMessage}
          onRefreshSnapshot={handleRefreshSnapshot}
          onBackHome={() => navigateTo(APP_ROUTES.home)}
        />
      ) : (
        <CodexDashboard
          snapshot={snapshot}
          connectionLabel={connectionLabel}
          codexHomeInput={codexHomeInput}
          onCodexHomeInputChange={setCodexHomeInput}
          onApplySource={() => updateSource(codexHomeInput.trim())}
          onResetSource={() => updateSource("").then(() => setCodexHomeInput(""))}
          onRefreshSnapshot={handleRefreshSnapshot}
          refreshStatus={refreshStatus}
          refreshMessage={refreshMessage}
          onOpenPricing={() => navigateTo(APP_ROUTES.pricing)}
          alertConfig={alertConfig}
          alertMetrics={alertMetrics}
          alertStates={alertStates}
          onAlertRuleChange={handleAlertRuleChange}
        />
      )}
    </div>
  );
}
