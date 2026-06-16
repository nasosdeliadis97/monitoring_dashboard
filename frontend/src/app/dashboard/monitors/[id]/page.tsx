"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiRequest } from "@/lib/api";

type MonitorStatus = "UP" | "DOWN" | null;

type Monitor = {
  id: string;
  name: string;
  url: string;
  expectedStatusCode: number;
  intervalSeconds: number;
  timeoutSeconds: number;
  isActive: boolean;
  lastStatus: MonitorStatus;
  createdAt: string;
  updatedAt: string;
};

type Check = {
  id: string;
  monitorId: string;
  status: "UP" | "DOWN";
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
  checkedAt: string;
};

type Incident = {
  id: string;
  monitorId: string;
  startedAt: string;
  resolvedAt: string | null;
  reason: string | null;
};

type MonitorResponse = {
  monitor: Monitor & {
    checks: Check[];
    incidents: Incident[];
  };
};

type ChecksResponse = {
  checks: Check[];
};

type IncidentsResponse = {
  incidents: Incident[];
};

type StatsResponse = {
  monitorId: string;
  periodDays: number;
  totalChecks: number;
  upChecks: number;
  downChecks: number;
  uptimePercentage: number | null;
  averageResponseTimeMs: number | null;
  openIncidents: number;
  latestCheck: Check | null;
};

export default function MonitorDetailPage() {
  const router = useRouter();
  const params = useParams();

  const monitorId = String(params.id);

  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setRefreshing(true);
      }

      setError("");

      try {
        const [monitorData, statsData, checksData, incidentsData] =
          await Promise.all([
            apiRequest<MonitorResponse>(`/monitors/${monitorId}`),
            apiRequest<StatsResponse>(`/monitors/${monitorId}/stats?days=7`),
            apiRequest<ChecksResponse>(`/monitors/${monitorId}/checks`),
            apiRequest<IncidentsResponse>(`/monitors/${monitorId}/incidents`),
          ]);

        setMonitor(monitorData.monitor);
        setStats(statsData);
        setChecks(checksData.checks);
        setIncidents(incidentsData.incidents);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load monitor";

        if (message.includes("authorization") || message.includes("token")) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [monitorId, router]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    loadData();
  }, [router, loadData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const token = localStorage.getItem("token");

      if (!token) {
        return;
      }

      loadData({ silent: true });
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadData]);

  const chartData = useMemo(() => {
    return [...checks]
      .reverse()
      .filter((check) => check.responseTimeMs !== null)
      .map((check) => ({
        time: new Date(check.checkedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        responseTimeMs: check.responseTimeMs ?? 0,
        status: check.status,
      }));
  }, [checks]);

  async function checkNow() {
    setChecking(true);
    setError("");

    try {
      await apiRequest(`/monitors/${monitorId}/check-now`, {
        method: "POST",
      });

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run check");
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-gray-400">Loading monitor...</p>
        </div>
      </main>
    );
  }

  if (!monitor) {
    return (
      <main className="min-h-screen bg-gray-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/dashboard"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to dashboard
          </Link>

          <div className="mt-6 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
            {error || "Monitor not found"}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to dashboard
        </Link>

        <header className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={
                  monitor.lastStatus === "UP"
                    ? "rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300"
                    : monitor.lastStatus === "DOWN"
                      ? "rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300"
                      : "rounded-full bg-gray-700 px-3 py-1 text-xs font-semibold text-gray-300"
                }
              >
                {monitor.lastStatus ?? "UNKNOWN"}
              </span>

              {!monitor.isActive && (
                <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-300">
                  PAUSED
                </span>
              )}

              <h1 className="text-3xl font-bold">{monitor.name}</h1>
            </div>

            <p className="mt-3 break-all text-sm text-gray-400">
              {monitor.url}
            </p>

            <p className="mt-2 text-xs text-gray-500">
              Expected {monitor.expectedStatusCode} · Every{" "}
              {monitor.intervalSeconds}s · Timeout {monitor.timeoutSeconds}s
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Auto-refreshes every 10 seconds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {refreshing && (
              <span className="text-xs text-gray-400">Refreshing...</span>
            )}

            <button
              onClick={() => loadData()}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-900"
            >
              Refresh
            </button>

            <button
              onClick={checkNow}
              disabled={checking}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checking ? "Checking..." : "Check now"}
            </button>
          </div>
        </header>

        {error && (
          <div className="mt-6 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <StatCard
            label="Uptime"
            value={
              stats?.uptimePercentage === null
                ? "N/A"
                : `${stats?.uptimePercentage ?? 0}%`
            }
          />

          <StatCard label="Total checks" value={String(stats?.totalChecks ?? 0)} />

          <StatCard
            label="Avg response"
            value={
              stats?.averageResponseTimeMs === null
                ? "N/A"
                : `${stats?.averageResponseTimeMs ?? 0}ms`
            }
          />

          <StatCard
            label="Open incidents"
            value={String(stats?.openIncidents ?? 0)}
          />
        </section>

        <section className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-xl font-semibold">Response time</h2>
          <p className="mt-1 text-sm text-gray-400">
            Last {chartData.length} checks with response time data.
          </p>

          {chartData.length === 0 ? (
            <p className="mt-6 text-sm text-gray-400">
              No response time data yet. Run a check first.
            </p>
          ) : (
            <div className="mt-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={12}
                    tickFormatter={(value) => `${value}ms`}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="responseTimeMs"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-xl font-semibold">Recent checks</h2>

            {checks.length === 0 ? (
              <p className="mt-4 text-sm text-gray-400">No checks yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {checks.slice(0, 10).map((check) => (
                  <div
                    key={check.id}
                    className="rounded-xl border border-gray-800 bg-gray-950 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span
                        className={
                          check.status === "UP"
                            ? "rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300"
                            : "rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300"
                        }
                      >
                        {check.status}
                      </span>

                      <span className="text-xs text-gray-500">
                        {new Date(check.checkedAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-gray-400">
                      Status code: {check.statusCode ?? "N/A"} · Response time:{" "}
                      {check.responseTimeMs ?? "N/A"}ms
                    </p>

                    {check.errorMessage && (
                      <p className="mt-2 text-sm text-red-300">
                        {check.errorMessage}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-xl font-semibold">Recent incidents</h2>

            {incidents.length === 0 ? (
              <p className="mt-4 text-sm text-gray-400">No incidents yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {incidents.slice(0, 10).map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-xl border border-gray-800 bg-gray-950 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span
                        className={
                          incident.resolvedAt
                            ? "rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300"
                            : "rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300"
                        }
                      >
                        {incident.resolvedAt ? "RESOLVED" : "OPEN"}
                      </span>

                      <span className="text-xs text-gray-500">
                        {new Date(incident.startedAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-gray-400">
                      {incident.reason ?? "No reason provided"}
                    </p>

                    {incident.resolvedAt && (
                      <p className="mt-2 text-xs text-gray-500">
                        Resolved at:{" "}
                        {new Date(incident.resolvedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <p className="text-sm text-gray-400">{props.label}</p>
      <p className="mt-2 text-2xl font-bold">{props.value}</p>
    </div>
  );
}
