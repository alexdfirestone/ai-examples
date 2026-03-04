"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import type { Id } from "../convex/_generated/dataModel";

const COMPETITOR_NAMES = ["E2B", "Daytona", "Modal"];

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

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Home() {
  const latestStatuses = useQuery(api.queries.getLatestPerCompetitor);
  const registrations = useQuery(api.queries.getRegistrations, {});
  const addRegistration = useMutation(api.mutations.addRegistration);
  const removeRegistration = useMutation(api.mutations.removeRegistration);

  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(
    null
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Competitor Downtime Tracker</h1>
        <p className="text-zinc-400 mb-8 text-sm">
          Sandbox status snapshots every 5 minutes
        </p>

        {/* Status Dashboard */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Current Status</h2>
          <div className="space-y-3">
            {latestStatuses === undefined ? (
              <div className="text-zinc-500 text-sm">Loading...</div>
            ) : latestStatuses.length === 0 ? (
              <div className="text-zinc-500 text-sm">
                No snapshots yet. Waiting for first cron run...
              </div>
            ) : (
              latestStatuses.map((s) => (
                <button
                  key={s._id}
                  onClick={() =>
                    setSelectedCompetitor(
                      selectedCompetitor === s.competitorName
                        ? null
                        : s.competitorName
                    )
                  }
                  className={`w-full flex items-center justify-between bg-zinc-900 rounded-lg px-4 py-3 border transition-colors text-left ${
                    selectedCompetitor === s.competitorName
                      ? "border-zinc-600"
                      : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div>
                    <span className="font-medium">{s.competitorName}</span>
                    <span className="text-zinc-500 text-sm ml-2">
                      {s.resourceName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span>{statusIndicator(s.status)}</span>
                    <span className={`capitalize ${statusColor(s.status)}`}>
                      {s.status}
                    </span>
                    <span className="text-zinc-600 text-xs">
                      {timeAgo(s.checkedAt)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Snapshot Timeline */}
        {selectedCompetitor && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-3">
              {selectedCompetitor} History
            </h2>
            <SnapshotTimeline competitorName={selectedCompetitor} />
          </section>
        )}

        {/* Registrations */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Account Registrations</h2>
          <p className="text-zinc-400 text-sm mb-4">
            Register your accounts so the team gets pinged in Slack when a
            competitor goes down.
          </p>
          <RegistrationForm onSubmit={addRegistration} />
          <div className="mt-6 space-y-2">
            {registrations === undefined ? (
              <div className="text-zinc-500 text-sm">Loading...</div>
            ) : registrations.length === 0 ? (
              <div className="text-zinc-500 text-sm">
                No registrations yet.
              </div>
            ) : (
              COMPETITOR_NAMES.map((name) => {
                const regs = registrations.filter(
                  (r) => r.competitorName === name
                );
                if (regs.length === 0) return null;
                return (
                  <div key={name} className="mb-4">
                    <h3 className="text-sm font-medium text-zinc-300 mb-2">
                      {name}
                    </h3>
                    {regs.map((r) => (
                      <div
                        key={r._id}
                        className="flex items-center justify-between bg-zinc-900 rounded px-3 py-2 border border-zinc-800 mb-1"
                      >
                        <div className="flex items-center gap-3 text-sm">
                          <span>{r.name}</span>
                          {r.sfdcAccountUrl && (
                            <a
                              href={r.sfdcAccountUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline"
                            >
                              SFDC
                            </a>
                          )}
                          {r.sharedChannelUrl && (
                            <a
                              href={r.sharedChannelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline"
                            >
                              Channel
                            </a>
                          )}
                          {r.slackUserId && (
                            <span className="text-zinc-500">
                              @{r.slackUserId}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            removeRegistration({
                              id: r._id as Id<"registrations">,
                            })
                          }
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

function SnapshotTimeline({ competitorName }: { competitorName: string }) {
  const history = useQuery(api.queries.getSnapshotHistory, {
    competitorName,
    limit: 50,
  });

  if (history === undefined) {
    return <div className="text-zinc-500 text-sm">Loading...</div>;
  }

  if (history.length === 0) {
    return <div className="text-zinc-500 text-sm">No snapshots yet.</div>;
  }

  // Group consecutive same-status entries, show transitions
  const transitions: Array<{
    status: string;
    from: number;
    to: number;
    count: number;
    incidentDescription?: string;
  }> = [];

  for (const snap of history) {
    const last = transitions[transitions.length - 1];
    if (last && last.status === snap.status) {
      last.to = snap.checkedAt;
      last.count++;
    } else {
      transitions.push({
        status: snap.status,
        from: snap.checkedAt,
        to: snap.checkedAt,
        count: 1,
        incidentDescription: snap.incidentDescription,
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
}: {
  onSubmit: (args: {
    name: string;
    competitorName: string;
    slackUserId?: string;
    sfdcAccountUrl?: string;
    sharedChannelUrl?: string;
  }) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [competitor, setCompetitor] = useState(COMPETITOR_NAMES[0]);
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
          {COMPETITOR_NAMES.map((c) => (
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
