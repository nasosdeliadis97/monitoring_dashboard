"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type MonitorsResponse = {
  monitors: Monitor[];
};

type MonitorResponse = {
  monitor: Monitor;
};

type CheckNowResponse = {
  monitorId: string;
  previousStatus: MonitorStatus;
  currentStatus: "UP" | "DOWN";
  check: {
    id: string;
    status: "UP" | "DOWN";
    statusCode: number | null;
    responseTimeMs: number | null;
    errorMessage: string | null;
    checkedAt: string;
  };
};

export default function DashboardPage() {
  const router = useRouter();

  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [name, setName] = useState("Example Website");
  const [url, setUrl] = useState("https://example.com");
  const [expectedStatusCode, setExpectedStatusCode] = useState(200);
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [timeoutSeconds, setTimeoutSeconds] = useState(10);

  const [editingMonitorId, setEditingMonitorId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editExpectedStatusCode, setEditExpectedStatusCode] = useState(200);
  const [editIntervalSeconds, setEditIntervalSeconds] = useState(60);
  const [editTimeoutSeconds, setEditTimeoutSeconds] = useState(10);
  const [editIsActive, setEditIsActive] = useState(true);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadMonitors = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setRefreshing(true);
      }

      setError("");

      try {
        const data = await apiRequest<MonitorsResponse>("/monitors");
        setMonitors(data.monitors);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load monitors";

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
    [router]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    loadMonitors();
  }, [router, loadMonitors]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const token = localStorage.getItem("token");

      if (!token) {
        return;
      }

      loadMonitors({ silent: true });
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadMonitors]);

  async function handleCreateMonitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      await apiRequest<MonitorResponse>("/monitors", {
        method: "POST",
        body: JSON.stringify({
          name,
          url,
          expectedStatusCode,
          intervalSeconds,
          timeoutSeconds,
        }),
      });

      await loadMonitors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create monitor");
    }
  }

  async function handleCheckNow(monitorId: string) {
    setActionLoadingId(monitorId);
    setError("");

    try {
      await apiRequest<CheckNowResponse>(`/monitors/${monitorId}/check-now`, {
        method: "POST",
      });

      await loadMonitors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run check");
    } finally {
      setActionLoadingId(null);
    }
  }

  function startEditing(monitor: Monitor) {
    setEditingMonitorId(monitor.id);
    setEditName(monitor.name);
    setEditUrl(monitor.url);
    setEditExpectedStatusCode(monitor.expectedStatusCode);
    setEditIntervalSeconds(monitor.intervalSeconds);
    setEditTimeoutSeconds(monitor.timeoutSeconds);
    setEditIsActive(monitor.isActive);
  }

  function cancelEditing() {
    setEditingMonitorId(null);
    setError("");
  }

  async function handleUpdateMonitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingMonitorId) {
      return;
    }

    setActionLoadingId(editingMonitorId);
    setError("");

    try {
      await apiRequest<MonitorResponse>(`/monitors/${editingMonitorId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName,
          url: editUrl,
          expectedStatusCode: editExpectedStatusCode,
          intervalSeconds: editIntervalSeconds,
          timeoutSeconds: editTimeoutSeconds,
          isActive: editIsActive,
        }),
      });

      setEditingMonitorId(null);
      await loadMonitors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update monitor");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDeleteMonitor(monitorId: string) {
    const confirmed = window.confirm(
      "Delete this monitor? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setActionLoadingId(monitorId);
    setError("");

    try {
      await apiRequest(`/monitors/${monitorId}`, {
        method: "DELETE",
      });

      await loadMonitors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete monitor");
    } finally {
      setActionLoadingId(null);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
            <p className="mt-1 text-sm text-gray-400">
              Manage uptime checks for your websites and APIs.
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
              onClick={() => loadMonitors()}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-900"
            >
              Refresh
            </button>

            <button
              onClick={logout}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-900"
            >
              Logout
            </button>
          </div>
        </header>

        {error && (
          <div className="mt-6 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-xl font-semibold">Create monitor</h2>

          <form
            onSubmit={handleCreateMonitor}
            className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5"
          >
            <Input label="Name" value={name} onChange={setName} />
            <Input label="URL" value={url} onChange={setUrl} type="url" wide />

            <NumberInput
              label="Expected"
              value={expectedStatusCode}
              onChange={setExpectedStatusCode}
              min={100}
              max={599}
            />

            <NumberInput
              label="Interval"
              value={intervalSeconds}
              onChange={setIntervalSeconds}
              min={60}
            />

            <NumberInput
              label="Timeout"
              value={timeoutSeconds}
              onChange={setTimeoutSeconds}
              min={1}
              max={60}
            />

            <div className="md:col-span-2 lg:col-span-5">
              <button className="rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500">
                Add monitor
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Monitors</h2>

          {loading ? (
            <p className="mt-4 text-gray-400">Loading monitors...</p>
          ) : monitors.length === 0 ? (
            <p className="mt-4 text-gray-400">No monitors yet.</p>
          ) : (
            <div className="mt-4 grid gap-4">
              {monitors.map((monitor) => (
                <div
                  key={monitor.id}
                  className="rounded-2xl border border-gray-800 bg-gray-900 p-5"
                >
                  {editingMonitorId === monitor.id ? (
                    <form onSubmit={handleUpdateMonitor} className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        <Input
                          label="Name"
                          value={editName}
                          onChange={setEditName}
                        />

                        <Input
                          label="URL"
                          value={editUrl}
                          onChange={setEditUrl}
                          type="url"
                          wide
                        />

                        <NumberInput
                          label="Expected"
                          value={editExpectedStatusCode}
                          onChange={setEditExpectedStatusCode}
                          min={100}
                          max={599}
                        />

                        <NumberInput
                          label="Interval"
                          value={editIntervalSeconds}
                          onChange={setEditIntervalSeconds}
                          min={60}
                        />

                        <NumberInput
                          label="Timeout"
                          value={editTimeoutSeconds}
                          onChange={setEditTimeoutSeconds}
                          min={1}
                          max={60}
                        />
                      </div>

                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          checked={editIsActive}
                          onChange={(event) =>
                            setEditIsActive(event.target.checked)
                          }
                          type="checkbox"
                        />
                        Active monitor
                      </label>

                      <div className="flex items-center gap-3">
                        <button
                          disabled={actionLoadingId === monitor.id}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoadingId === monitor.id
                            ? "Saving..."
                            : "Save changes"}
                        </button>

                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div>
                        <div className="flex items-center gap-3">
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

                          <Link
                            href={`/dashboard/monitors/${monitor.id}`}
                            className="text-lg font-semibold hover:text-blue-400"
                          >
                            {monitor.name}
                          </Link>
                        </div>

                        <p className="mt-2 break-all text-sm text-gray-400">
                          {monitor.url}
                        </p>

                        <p className="mt-2 text-xs text-gray-500">
                          Expected {monitor.expectedStatusCode} · Every{" "}
                          {monitor.intervalSeconds}s · Timeout{" "}
                          {monitor.timeoutSeconds}s
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => handleCheckNow(monitor.id)}
                          disabled={actionLoadingId === monitor.id}
                          className="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoadingId === monitor.id
                            ? "Working..."
                            : "Check now"}
                        </button>

                        <button
                          onClick={() => startEditing(monitor)}
                          disabled={actionLoadingId === monitor.id}
                          className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteMonitor(monitor.id)}
                          disabled={actionLoadingId === monitor.id}
                          className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-300 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Input(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  wide?: boolean;
}) {
  return (
    <div className={props.wide ? "lg:col-span-2" : "lg:col-span-1"}>
      <label className="text-sm text-gray-300">{props.label}</label>
      <input
        className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 outline-none focus:border-blue-500"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        type={props.type ?? "text"}
        required
      />
    </div>
  );
}

function NumberInput(props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="text-sm text-gray-300">{props.label}</label>
      <input
        className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 outline-none focus:border-blue-500"
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
        type="number"
        min={props.min}
        max={props.max}
        required
      />
    </div>
  );
}
