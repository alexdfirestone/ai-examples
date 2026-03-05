"use client";

import { createBrowserClient } from "@/lib/supabase";
import type { TrackedResource } from "@/lib/supabase";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type DiscoveredResource = {
  id: string;
  name: string;
  status: string;
};

type CompetitorResources = {
  competitorName: string;
  statusPageUrl: string;
  resources: DiscoveredResource[];
};

const supabase = createBrowserClient();

function statusDot(status: string) {
  switch (status) {
    case "operational":
      return "bg-green-500";
    case "degraded":
      return "bg-yellow-500";
    case "downtime":
      return "bg-red-500";
    case "maintenance":
      return "bg-blue-500";
    default:
      return "bg-zinc-500";
  }
}

export default function ConfigurePage() {
  const [discovered, setDiscovered] = useState<CompetitorResources[] | null>(
    null
  );
  const [tracked, setTracked] = useState<TrackedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [feedRes, trackedRes] = await Promise.all([
        fetch("/api/discover-resources"),
        supabase.from("tracked_resources").select("*"),
      ]);

      const feeds: CompetitorResources[] = await feedRes.json();
      setDiscovered(feeds);
      setTracked((trackedRes.data ?? []) as TrackedResource[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function isEnabled(competitorName: string, resourceId: string): boolean {
    const row = tracked.find(
      (t) => t.competitor_name === competitorName && t.resource_id === resourceId
    );
    return row?.enabled ?? false;
  }

  function getTrackedRow(
    competitorName: string,
    resourceId: string
  ): TrackedResource | undefined {
    return tracked.find(
      (t) => t.competitor_name === competitorName && t.resource_id === resourceId
    );
  }

  async function toggleResource(
    competitorName: string,
    resource: DiscoveredResource
  ) {
    const key = `${competitorName}:${resource.id}`;
    setTogglingIds((prev) => new Set(prev).add(key));

    try {
      const existing = getTrackedRow(competitorName, resource.id);

      if (existing) {
        // Update existing row
        const newEnabled = !existing.enabled;
        const { error } = await supabase
          .from("tracked_resources")
          .update({ enabled: newEnabled })
          .eq("id", existing.id);

        if (!error) {
          setTracked((prev) =>
            prev.map((t) =>
              t.id === existing.id ? { ...t, enabled: newEnabled } : t
            )
          );
        }
      } else {
        // Insert new row (enabled by default)
        const { data, error } = await supabase
          .from("tracked_resources")
          .insert({
            competitor_name: competitorName,
            resource_id: resource.id,
            resource_name: resource.name,
            enabled: true,
          })
          .select()
          .single();

        if (!error && data) {
          setTracked((prev) => [...prev, data as TrackedResource]);
        }
      }
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function enableAll() {
    if (!discovered) return;
    for (const comp of discovered) {
      for (const resource of comp.resources) {
        const existing = getTrackedRow(comp.competitorName, resource.id);
        if (!existing) {
          const { data } = await supabase
            .from("tracked_resources")
            .insert({
              competitor_name: comp.competitorName,
              resource_id: resource.id,
              resource_name: resource.name,
              enabled: true,
            })
            .select()
            .single();
          if (data) setTracked((prev) => [...prev, data as TrackedResource]);
        } else if (!existing.enabled) {
          await supabase
            .from("tracked_resources")
            .update({ enabled: true })
            .eq("id", existing.id);
          setTracked((prev) =>
            prev.map((t) =>
              t.id === existing.id ? { ...t, enabled: true } : t
            )
          );
        }
      }
    }
  }

  async function disableAll() {
    if (!discovered) return;
    const { error } = await supabase
      .from("tracked_resources")
      .update({ enabled: false })
      .neq("id", "00000000-0000-0000-0000-000000000000"); // update all rows

    if (!error) {
      setTracked((prev) => prev.map((t) => ({ ...t, enabled: false })));
    }
  }

  const totalEnabled = tracked.filter((t) => t.enabled).length;
  const totalResources =
    discovered?.reduce((sum, c) => sum + c.resources.length, 0) ?? 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">Configure Tracked Resources</h1>
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            &larr; Dashboard
          </Link>
        </div>
        <p className="text-zinc-400 mb-6 text-sm">
          Choose which resources to monitor. Only enabled resources will be
          included in snapshots and Slack alerts.
        </p>

        {loading ? (
          <div className="text-zinc-500 text-sm">
            Discovering resources from status pages...
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="flex items-center justify-between mb-6 bg-zinc-900 rounded-lg px-4 py-3 border border-zinc-800">
              <span className="text-sm text-zinc-300">
                <span className="font-medium text-white">{totalEnabled}</span>{" "}
                of {totalResources} resources enabled
              </span>
              <div className="flex gap-2">
                <button
                  onClick={enableAll}
                  className="bg-zinc-800 hover:bg-zinc-700 text-xs px-3 py-1.5 rounded transition-colors"
                >
                  Enable All
                </button>
                <button
                  onClick={disableAll}
                  className="bg-zinc-800 hover:bg-zinc-700 text-xs px-3 py-1.5 rounded transition-colors"
                >
                  Disable All
                </button>
              </div>
            </div>

            {/* Per-competitor sections */}
            <div className="space-y-8">
              {discovered?.map((comp) => (
                <section key={comp.competitorName}>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-lg font-semibold">
                      {comp.competitorName}
                    </h2>
                    <span className="text-xs text-zinc-500">
                      {comp.resources.length} resource
                      {comp.resources.length !== 1 ? "s" : ""}
                    </span>
                    <a
                      href={comp.statusPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline ml-auto"
                    >
                      Status Page &rarr;
                    </a>
                  </div>

                  {comp.resources.length === 0 ? (
                    <div className="text-zinc-500 text-sm bg-zinc-900 rounded-lg px-4 py-3 border border-zinc-800">
                      No resources found in feed.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {comp.resources.map((resource) => {
                        const key = `${comp.competitorName}:${resource.id}`;
                        const enabled = isEnabled(
                          comp.competitorName,
                          resource.id
                        );
                        const toggling = togglingIds.has(key);

                        return (
                          <div
                            key={resource.id}
                            className={`flex items-center justify-between bg-zinc-900 rounded-lg px-4 py-3 border transition-colors ${
                              enabled
                                ? "border-zinc-700"
                                : "border-zinc-800/50 opacity-60"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-2 h-2 rounded-full ${statusDot(resource.status)}`}
                              />
                              <span className="text-sm font-medium">
                                {resource.name}
                              </span>
                              <span className="text-xs text-zinc-500 capitalize">
                                {resource.status}
                              </span>
                            </div>

                            <button
                              onClick={() =>
                                toggleResource(
                                  comp.competitorName,
                                  resource
                                )
                              }
                              disabled={toggling}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                enabled ? "bg-green-600" : "bg-zinc-700"
                              } ${toggling ? "opacity-50" : ""}`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  enabled ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
