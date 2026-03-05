"use client";

import { createBrowserClient } from "@/lib/supabase";
import type { Snapshot, Registration } from "@/lib/supabase";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

const supabase = createBrowserClient();

function statusIndicator(status: string) {
  switch (status) {
    case "operational":
      return "\u{1F7E2}";
    case "degraded":
      return "\u{1F7E1}";
    case "downtime":
      return "\u{1F534}";
    case "maintenance":
      return "\u{1F535}";
    default:
      return "\u26AA";
  }
}

function statusColor(status: string) {
  switch (status) {
    case "operational":
      return "text-green-400";
    case "degraded":
      return "text-yellow-400";
    case "downtime":
      return "text-red-400";
    case "maintenance":
      return "text-blue-400";
    default:
      return "text-zinc-400";
  }
}

function timeAgo(isoString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(isoString).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type ResourceKey = string; // "CompetitorName:resource_id"

// Returns ms until the next 5-min cron boundary (e.g. :00, :05, :10)
function msUntilNextCron(): number {
  const now = new Date();
  const mins = now.getMinutes();
  const nextCronMin = Math.ceil((mins + 1) / 5) * 5;
  const next = new Date(now);
  next.setMinutes(nextCronMin, 0, 0);
  if (next <= now) next.setMinutes(next.getMinutes() + 5);
  return next.getTime() - now.getTime();
}

function CronCountdown({
  onCronFire,
  isRunning,
}: {
  onCronFire: () => void;
  isRunning: boolean;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.floor(msUntilNextCron() / 1000)
  );
  const firedRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const ms = msUntilNextCron();
      const secs = Math.floor(ms / 1000);
      setSecondsLeft(secs);

      // Fire once when we cross the boundary (within 2s window)
      if (secs <= 1 && !firedRef.current) {
        firedRef.current = true;
        onCronFire();
      }
      // Reset the guard once we're past the boundary
      if (secs > 5) {
        firedRef.current = false;
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [onCronFire]);

  if (isRunning) {
    return (
      <span className="inline-flex items-center gap-1.5 text-zinc-400 text-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
        Checking now&hellip;
      </span>
    );
  }

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const display =
    m > 0
      ? `${m}m ${s.toString().padStart(2, "0")}s`
      : `${s}s`;

  return (
    <span className="text-zinc-500 text-sm tabular-nums">
      Next check in{" "}
      <span className="text-zinc-300 font-medium">{display}</span>
    </span>
  );
}

export default function Home() {
  const [latestStatuses, setLatestStatuses] = useState<Snapshot[] | undefined>(
    undefined
  );
  const [registrations, setRegistrations] = useState<
    Registration[] | undefined
  >(undefined);
  const [selectedResource, setSelectedResource] = useState<ResourceKey | null>(
    null
  );
  const [snapshotRunning, setSnapshotRunning] = useState(false);
  const [cronRefreshing, setCronRefreshing] = useState(false);

  const handleCronFire = useCallback(async () => {
    // The Vercel cron just fired — wait a few seconds for it to finish,
    // then refresh the data automatically.
    setCronRefreshing(true);
    await new Promise((r) => setTimeout(r, 8000)); // give cron time to complete
    await fetchLatestRef.current();
    setCronRefreshing(false);
  }, []);

  // Use a ref so the countdown's stable callback can always call the latest fetch
  const fetchLatestRef = useRef<() => Promise<void>>(async () => {});

  const fetchLatest = useCallback(async () => {
    // Fetch latest snapshot per (competitor_name, resource_id) for tracked resources
    // We fetch recent snapshots and deduplicate client-side
    const { data } = await supabase
      .from("snapshots")
      .select("*")
      .not("resource_id", "is", null)
      .order("checked_at", { ascending: false })
      .limit(200);

    if (!data) {
      setLatestStatuses([]);
      return;
    }

    // Deduplicate: keep the most recent per competitor+resource pair
    const seen = new Set<string>();
    const latest: Snapshot[] = [];
    for (const snap of data as Snapshot[]) {
      const key = `${snap.competitor_name}:${snap.resource_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        latest.push(snap);
      }
    }

    setLatestStatuses(latest);
  }, []);

  // Keep the ref in sync so the countdown callback always uses the latest version
  fetchLatestRef.current = fetchLatest;

  const fetchRegistrations = useCallback(async () => {
    const { data } = await supabase
      .from("registrations")
      .select("*")
      .order("created_at", { ascending: true });
    setRegistrations((data ?? []) as Registration[]);
  }, []);

  useEffect(() => {
    fetchLatest();
    fetchRegistrations();
    const interval = setInterval(fetchLatest, 60_000);
    return () => clearInterval(interval);
  }, [fetchLatest, fetchRegistrations]);

  async function addRegistration(args: {
    name: string;
    competitorName: string;
    slackUserId?: string;
    sfdcAccountUrl?: string;
    sharedChannelUrl?: string;
  }) {
    const { data, error } = await supabase
      .from("registrations")
      .insert({
        name: args.name,
        competitor_name: args.competitorName,
        slack_user_id: args.slackUserId || null,
        sfdc_account_url: args.sfdcAccountUrl || null,
        shared_channel_url: args.sharedChannelUrl || null,
      })
      .select()
      .single();
    if (!error && data) {
      setRegistrations((prev) => [...(prev ?? []), data as Registration]);
    }
  }

  async function removeRegistration(id: string) {
    const { error } = await supabase
      .from("registrations")
      .delete()
      .eq("id", id);
    if (!error) {
      setRegistrations((prev) => (prev ?? []).filter((r) => r.id !== id));
    }
  }

  // Group snapshots by competitor
  const competitorNames = Array.from(
    new Set(latestStatuses?.map((s) => s.competitor_name) ?? [])
  ).sort();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">
            Competitor Downtime Tracker
          </h1>
          <div className="flex items-center gap-3">
            <Link
              href="/configure"
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Configure &rarr;
            </Link>
            <button
              onClick={async () => {
                setSnapshotRunning(true);
                try {
                  await fetch("/api/trigger-snapshot", { method: "POST" });
                  await fetchLatest();
                } finally {
                  setSnapshotRunning(false);
                }
              }}
              disabled={snapshotRunning}
              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-sm px-3 py-1.5 rounded transition-colors"
            >
              {snapshotRunning ? "Running..." : "Run Snapshot Now"}
            </button>
          </div>
        </div>
        <div className="mb-8">
          <CronCountdown
            onCronFire={handleCronFire}
            isRunning={cronRefreshing}
          />
        </div>

        {/* Status Dashboard */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Current Status</h2>
          <div className="space-y-6">
            {latestStatuses === undefined ? (
              <div className="text-zinc-500 text-sm">Loading...</div>
            ) : latestStatuses.length === 0 ? (
              <div className="text-zinc-500 text-sm">
                No snapshots yet. Enable resources in{" "}
                <Link href="/configure" className="text-blue-400 hover:underline">
                  Configure
                </Link>{" "}
                and run a snapshot.
              </div>
            ) : (
              competitorNames.map((compName) => {
                const compSnapshots = latestStatuses.filter(
                  (s) => s.competitor_name === compName
                );
                return (
                  <div key={compName}>
                    <h3 className="text-sm font-medium text-zinc-400 mb-2">
                      {compName}
                    </h3>
                    <div className="space-y-1">
                      {compSnapshots.map((s) => {
                        const resourceKey = `${s.competitor_name}:${s.resource_id}`;
                        return (
                          <button
                            key={resourceKey}
                            onClick={() =>
                              setSelectedResource(
                                selectedResource === resourceKey
                                  ? null
                                  : resourceKey
                              )
                            }
                            className={`w-full flex items-center justify-between bg-zinc-900 rounded-lg px-4 py-3 border transition-colors text-left ${
                              selectedResource === resourceKey
                                ? "border-zinc-600"
                                : "border-zinc-800 hover:border-zinc-700"
                            }`}
                          >
                            <div>
                              <span className="font-medium text-sm">
                                {s.resource_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span>{statusIndicator(s.status)}</span>
                              <span
                                className={`capitalize ${statusColor(s.status)}`}
                              >
                                {s.status}
                              </span>
                              <span className="text-zinc-600 text-xs">
                                {timeAgo(s.checked_at)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Snapshot Timeline */}
        {selectedResource && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-3">
              {selectedResource.split(":")[0]} &mdash;{" "}
              {latestStatuses?.find(
                (s) =>
                  `${s.competitor_name}:${s.resource_id}` === selectedResource
              )?.resource_name ?? ""}{" "}
              History
            </h2>
            <SnapshotTimeline
              competitorName={selectedResource.split(":")[0]}
              resourceId={selectedResource.split(":").slice(1).join(":")}
            />
          </section>
        )}

        {/* Registrations */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">
            Account Registrations
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            Register your accounts so the team gets pinged in Slack when a
            competitor goes down.
          </p>
          <RegistrationForm
            onSubmit={addRegistration}
            competitorNames={
              competitorNames.length > 0
                ? competitorNames
                : ["E2B", "Daytona", "Modal"]
            }
          />
          <div className="mt-6 space-y-2">
            {registrations === undefined ? (
              <div className="text-zinc-500 text-sm">Loading...</div>
            ) : registrations.length === 0 ? (
              <div className="text-zinc-500 text-sm">
                No registrations yet.
              </div>
            ) : (
              Array.from(
                new Set(registrations.map((r) => r.competitor_name))
              ).map((name) => {
                const regs = registrations.filter(
                  (r) => r.competitor_name === name
                );
                return (
                  <div key={name} className="mb-4">
                    <h3 className="text-sm font-medium text-zinc-300 mb-2">
                      {name}
                    </h3>
                    {regs.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between bg-zinc-900 rounded px-3 py-2 border border-zinc-800 mb-1"
                      >
                        <div className="flex items-center gap-3 text-sm">
                          <span>{r.name}</span>
                          {r.sfdc_account_url && (
                            <a
                              href={r.sfdc_account_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline"
                            >
                              SFDC
                            </a>
                          )}
                          {r.shared_channel_url && (
                            <a
                              href={r.shared_channel_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline"
                            >
                              Channel
                            </a>
                          )}
                          {r.slack_user_id && (
                            <span className="text-zinc-500">
                              @{r.slack_user_id}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeRegistration(r.id)}
                          className="text-zinc-600 hover:text-red-400 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SnapshotTimeline({
  competitorName,
  resourceId,
}: {
  competitorName: string;
  resourceId: string;
}) {
  const [history, setHistory] = useState<Snapshot[] | undefined>(undefined);

  useEffect(() => {
    async function fetchHistory() {
      const { data } = await supabase
        .from("snapshots")
        .select("*")
        .eq("competitor_name", competitorName)
        .eq("resource_id", resourceId)
        .order("checked_at", { ascending: false })
        .limit(50);
      setHistory((data ?? []) as Snapshot[]);
    }
    fetchHistory();
  }, [competitorName, resourceId]);

  if (history === undefined) {
    return <div className="text-zinc-500 text-sm">Loading...</div>;
  }

  if (history.length === 0) {
    return <div className="text-zinc-500 text-sm">No snapshots yet.</div>;
  }

  // Group consecutive same-status entries, show transitions
  const transitions: Array<{
    status: string;
    from: string;
    to: string;
    count: number;
    incidentDescription?: string | null;
  }> = [];

  for (const snap of history) {
    const last = transitions[transitions.length - 1];
    if (last && last.status === snap.status) {
      last.to = snap.checked_at;
      last.count++;
    } else {
      transitions.push({
        status: snap.status,
        from: snap.checked_at,
        to: snap.checked_at,
        count: 1,
        incidentDescription: snap.incident_description,
      });
    }
  }

  return (
    <div className="space-y-1">
      {transitions.map((t, i) => (
        <div
          key={i}
          className="flex items-center gap-3 bg-zinc-900 rounded px-3 py-2 border border-zinc-800 text-sm"
        >
          <span>{statusIndicator(t.status)}</span>
          <span className={`capitalize font-medium ${statusColor(t.status)}`}>
            {t.status}
          </span>
          <span className="text-zinc-500">
            {new Date(t.from).toLocaleString()}
            {t.count > 1 && ` (${t.count} checks)`}
          </span>
          {t.incidentDescription && (
            <span className="text-zinc-400 text-xs truncate max-w-xs">
              {t.incidentDescription}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function RegistrationForm({
  onSubmit,
  competitorNames,
}: {
  onSubmit: (args: {
    name: string;
    competitorName: string;
    slackUserId?: string;
    sfdcAccountUrl?: string;
    sharedChannelUrl?: string;
  }) => Promise<void>;
  competitorNames: string[];
}) {
  const [name, setName] = useState("");
  const [competitor, setCompetitor] = useState(competitorNames[0]);
  const [slackUserId, setSlackUserId] = useState("");
  const [sfdcAccountUrl, setSfdcAccountUrl] = useState("");
  const [sharedChannelUrl, setSharedChannelUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        competitorName: competitor,
        ...(slackUserId.trim() ? { slackUserId: slackUserId.trim() } : {}),
        ...(sfdcAccountUrl.trim()
          ? { sfdcAccountUrl: sfdcAccountUrl.trim() }
          : {}),
        ...(sharedChannelUrl.trim()
          ? { sharedChannelUrl: sharedChannelUrl.trim() }
          : {}),
      });
      setName("");
      setSlackUserId("");
      setSfdcAccountUrl("");
      setSharedChannelUrl("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Your name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        <select
          value={competitor}
          onChange={(e) => setCompetitor(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
        >
          {competitorNames.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Slack User ID"
          value={slackUserId}
          onChange={(e) => setSlackUserId(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        <input
          type="url"
          placeholder="SFDC Account URL"
          value={sfdcAccountUrl}
          onChange={(e) => setSfdcAccountUrl(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        <input
          type="url"
          placeholder="Shared Channel URL"
          value={sharedChannelUrl}
          onChange={(e) => setSharedChannelUrl(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-sm px-4 py-2 rounded transition-colors"
      >
        {submitting ? "Adding..." : "Add Registration"}
      </button>
    </form>
  );
}
