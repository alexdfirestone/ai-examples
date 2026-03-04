"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import { createPatch, diffLines } from "diff";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface Snapshot {
  _id: Id<"snapshots">;
  fetchedAt: number;
  sectionCount: number;
  storageId: string;
}

type SectionStatus =
  | "unchanged"
  | "modified"
  | "added"
  | "removed"
  | "no_comparison";

/** Lightweight section metadata (no content blob) */
interface SectionMeta {
  title: string;
  description: string;
  source: string;
  contentHash: string;
  lastUpdated: string;
  status: SectionStatus;
}

// ─── Change magnitude ───────────────────────────────────────────────────────────

type MagnitudeLevel = "major" | "minor" | "trivial";

interface ChangeMagnitude {
  level: MagnitudeLevel;
  linesAdded: number;
  linesRemoved: number;
  totalLines: number;
  percentChanged: number;
}

function computeMagnitude(
  oldContent: string,
  newContent: string
): ChangeMagnitude {
  const changes = diffLines(oldContent, newContent);
  let linesAdded = 0;
  let linesRemoved = 0;
  let totalOld = 0;

  for (const part of changes) {
    const lineCount = part.value.split("\n").filter((l) => l.length > 0).length;
    if (part.added) {
      linesAdded += lineCount;
    } else if (part.removed) {
      linesRemoved += lineCount;
    }
    if (!part.added) {
      totalOld += lineCount;
    }
  }

  const totalLines = Math.max(totalOld, 1);
  const percentChanged = ((linesAdded + linesRemoved) / totalLines) * 100;
  const totalChanged = linesAdded + linesRemoved;

  let level: MagnitudeLevel;
  if (totalChanged <= 3) {
    level = "trivial";
  } else if (totalChanged <= 15 && percentChanged < 10) {
    level = "minor";
  } else {
    level = "major";
  }

  return { level, linesAdded, linesRemoved, totalLines, percentChanged };
}

const MAGNITUDE_CONFIG: Record<
  MagnitudeLevel,
  { label: string; bg: string; text: string; barColor: string }
> = {
  major: {
    label: "Major",
    bg: "bg-orange-50",
    text: "text-orange-700",
    barColor: "bg-orange-400",
  },
  minor: {
    label: "Minor",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    barColor: "bg-yellow-400",
  },
  trivial: {
    label: "Trivial",
    bg: "bg-gray-50",
    text: "text-gray-400",
    barColor: "bg-gray-300",
  },
};

function MagnitudeBadge({ magnitude }: { magnitude: ChangeMagnitude }) {
  const config = MAGNITUDE_CONFIG[magnitude.level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full ${config.bg} ${config.text}`}
      title={`+${magnitude.linesAdded} −${magnitude.linesRemoved} lines (${magnitude.percentChanged.toFixed(1)}% of ${magnitude.totalLines} lines)`}
    >
      {config.label}
      <span className="opacity-60">
        {magnitude.percentChanged < 1
          ? "<1%"
          : `${Math.round(magnitude.percentChanged)}%`}
      </span>
    </span>
  );
}

function MagnitudeBar({ magnitude }: { magnitude: ChangeMagnitude }) {
  const config = MAGNITUDE_CONFIG[magnitude.level];
  const width = Math.min(Math.max(magnitude.percentChanged, 2), 100);
  return (
    <div className="w-[60px] h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
      <div
        className={`h-full rounded-full ${config.barColor}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// ─── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SectionStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  unchanged: {
    label: "Unchanged",
    bg: "bg-gray-50",
    text: "text-gray-500",
    dot: "bg-gray-300",
  },
  modified: {
    label: "Modified",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  added: {
    label: "Added",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  removed: {
    label: "Removed",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  no_comparison: {
    label: "No comparison",
    bg: "bg-gray-50",
    text: "text-gray-400",
    dot: "bg-gray-200",
  },
};

function StatusBadge({ status }: { status: SectionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

// ─── Diff viewer ────────────────────────────────────────────────────────────────

function UnifiedDiff({
  oldContent,
  newContent,
  title,
}: {
  oldContent: string;
  newContent: string;
  title: string;
}) {
  const patch = useMemo(
    () =>
      createPatch(title, oldContent, newContent, "previous", "current", {
        context: 3,
      }),
    [oldContent, newContent, title]
  );

  const lines = patch.split("\n");

  const patchStats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) additions++;
      if (line.startsWith("-") && !line.startsWith("---")) deletions++;
    }
    return { additions, deletions };
  }, [lines]);

  const firstHunkIdx = lines.findIndex((l) => l.startsWith("@@"));
  const diffLinesList = firstHunkIdx >= 0 ? lines.slice(firstHunkIdx) : [];

  return (
    <div className="mt-3">
      <div className="flex items-center gap-3 mb-2 text-xs">
        <span className="text-green-700 font-medium">
          +{patchStats.additions}
        </span>
        <span className="text-red-600 font-medium">
          &minus;{patchStats.deletions}
        </span>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <pre className="text-[13px] font-mono leading-5 overflow-x-auto">
          {diffLinesList.map((line, i) => {
            let bg = "";
            let textColor = "text-gray-700";
            if (line.startsWith("@@")) {
              bg = "bg-blue-50";
              textColor = "text-blue-600 text-xs";
            } else if (line.startsWith("+")) {
              bg = "bg-green-50";
              textColor = "text-green-800";
            } else if (line.startsWith("-")) {
              bg = "bg-red-50";
              textColor = "text-red-800";
            }
            return (
              <div key={i} className={`px-4 ${bg} ${textColor}`}>
                <span className="select-none text-gray-400 inline-block w-8 text-right mr-4 text-[11px]">
                  {i + 1}
                </span>
                {line}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

// ─── Content viewer ─────────────────────────────────────────────────────────────

function ContentBlock({
  content,
  tint,
}: {
  content: string;
  tint?: "red" | "green";
}) {
  const bgClass =
    tint === "red"
      ? "bg-red-50"
      : tint === "green"
        ? "bg-green-50"
        : "bg-gray-50";

  return (
    <div className="mt-3">
      <div
        className={`border border-gray-200 rounded-lg overflow-hidden ${bgClass}`}
      >
        <pre className="text-[13px] font-mono leading-5 p-4 overflow-x-auto whitespace-pre-wrap text-gray-700 max-h-[400px] overflow-y-auto">
          {content}
        </pre>
      </div>
    </div>
  );
}

// ─── Section row (loads content on demand) ──────────────────────────────────────

function SectionRow({
  section,
  magnitude,
  snapshotId,
  compareSnapshotId,
}: {
  section: SectionMeta;
  magnitude?: ChangeMagnitude;
  snapshotId: Id<"snapshots">;
  compareSnapshotId: Id<"snapshots"> | null;
}) {
  const [expanded, setExpanded] = useState(false);

  // Only fetch content when expanded — keeps the list view lightweight
  const contentResult = useQuery(
    api.queries.getSectionContent,
    expanded
      ? {
          snapshotId,
          source: section.source,
          ...(compareSnapshotId
            ? { compareToSnapshotId: compareSnapshotId }
            : {}),
        }
      : "skip"
  );

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
      >
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${
            expanded ? "rotate-90" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {section.title}
            </span>
            <StatusBadge status={section.status} />
            {magnitude && <MagnitudeBadge magnitude={magnitude} />}
          </div>
          <div className="text-xs text-gray-400 truncate mt-0.5">
            {section.source.replace("https://vercel.com/docs/", "/")}
          </div>
        </div>
        {magnitude && <MagnitudeBar magnitude={magnitude} />}
        <span className="text-[11px] font-mono text-gray-300 flex-shrink-0">
          {section.contentHash.slice(0, 12)}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
            <a
              href={section.source}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 underline"
            >
              View on Vercel Docs
            </a>
            <span>Hash: {section.contentHash.slice(0, 24)}...</span>
            <span>Updated: {section.lastUpdated}</span>
          </div>

          {!contentResult ? (
            <div className="text-sm text-gray-400 py-4">Loading content...</div>
          ) : (
            <>
              {section.status === "modified" &&
                contentResult.oldContent !== undefined && (
                  <UnifiedDiff
                    oldContent={contentResult.oldContent}
                    newContent={contentResult.content}
                    title={section.source}
                  />
                )}

              {section.status === "added" && (
                <ContentBlock content={contentResult.content} tint="green" />
              )}

              {section.status === "removed" && (
                <ContentBlock
                  content={contentResult.oldContent ?? contentResult.content}
                  tint="red"
                />
              )}

              {(section.status === "unchanged" ||
                section.status === "no_comparison") && (
                <ContentBlock content={contentResult.content} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Filter tabs ────────────────────────────────────────────────────────────────

type FilterMode =
  | "all"
  | "major"
  | "minor"
  | "trivial"
  | "added"
  | "removed"
  | "unchanged";

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const snapshots = useQuery(api.queries.getSnapshots) as
    | Snapshot[]
    | undefined;
  const triggerFetch = useAction(api.snapshots.triggerFetch);

  const [selectedSnapshotId, setSelectedSnapshotId] =
    useState<Id<"snapshots"> | null>(null);
  const [compareToSnapshotId, setCompareToSnapshotId] =
    useState<Id<"snapshots"> | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  // Auto-select latest snapshot and compare to previous
  const selectedId = selectedSnapshotId ?? snapshots?.[0]?._id ?? null;
  const compareId =
    compareToSnapshotId ??
    (snapshots && snapshots.length > 1 ? snapshots[1]._id : null);

  // ── Lightweight metadata queries (no content blobs) ──
  const currentMeta = useQuery(
    api.queries.getSnapshotMeta,
    selectedId ? { snapshotId: selectedId } : "skip"
  ) as { title: string; description: string; source: string; contentHash: string; lastUpdated: string }[] | undefined;

  const compareMeta = useQuery(
    api.queries.getSnapshotMeta,
    compareId ? { snapshotId: compareId } : "skip"
  ) as { title: string; description: string; source: string; contentHash: string; lastUpdated: string }[] | undefined;

  // ── Client-side status computation from hash comparison ──
  const sections: SectionMeta[] = useMemo(() => {
    if (!currentMeta) return [];

    if (!compareMeta) {
      return currentMeta.map((s) => ({
        ...s,
        status: "no_comparison" as const,
      }));
    }

    const compareMap = new Map(compareMeta.map((s) => [s.source, s]));
    const currentSources = new Set(currentMeta.map((s) => s.source));

    const result: SectionMeta[] = currentMeta.map((s) => {
      const prev = compareMap.get(s.source);
      let status: SectionStatus;
      if (!prev) status = "added";
      else if (prev.contentHash !== s.contentHash) status = "modified";
      else status = "unchanged";
      return { ...s, status };
    });

    // Add removed sections
    for (const prev of compareMeta) {
      if (!currentSources.has(prev.source)) {
        result.push({ ...prev, status: "removed" });
      }
    }

    return result;
  }, [currentMeta, compareMeta]);

  // ── Batch-load content for modified sections to compute magnitudes ──
  const modifiedSources = useMemo(
    () => sections.filter((s) => s.status === "modified").map((s) => s.source),
    [sections]
  );

  // Load in batches of 100 (first batch for magnitude stats)
  const modifiedBatch = useQuery(
    api.queries.getModifiedContentBatch,
    selectedId && compareId && modifiedSources.length > 0
      ? {
          snapshotId: selectedId,
          compareToSnapshotId: compareId,
          sources: modifiedSources.slice(0, 100),
        }
      : "skip"
  ) as { source: string; content: string; oldContent: string }[] | undefined;

  // Second batch if > 100 modified
  const modifiedBatch2 = useQuery(
    api.queries.getModifiedContentBatch,
    selectedId && compareId && modifiedSources.length > 100
      ? {
          snapshotId: selectedId,
          compareToSnapshotId: compareId,
          sources: modifiedSources.slice(100, 200),
        }
      : "skip"
  ) as { source: string; content: string; oldContent: string }[] | undefined;

  // Third batch if > 200 modified
  const modifiedBatch3 = useQuery(
    api.queries.getModifiedContentBatch,
    selectedId && compareId && modifiedSources.length > 200
      ? {
          snapshotId: selectedId,
          compareToSnapshotId: compareId,
          sources: modifiedSources.slice(200, 300),
        }
      : "skip"
  ) as { source: string; content: string; oldContent: string }[] | undefined;

  // Fourth batch if > 300 modified
  const modifiedBatch4 = useQuery(
    api.queries.getModifiedContentBatch,
    selectedId && compareId && modifiedSources.length > 300
      ? {
          snapshotId: selectedId,
          compareToSnapshotId: compareId,
          sources: modifiedSources.slice(300, 400),
        }
      : "skip"
  ) as { source: string; content: string; oldContent: string }[] | undefined;

  // Compute magnitudes from loaded content
  const magnitudeMap = useMemo(() => {
    const map = new Map<string, ChangeMagnitude>();
    const allBatches = [
      ...(modifiedBatch ?? []),
      ...(modifiedBatch2 ?? []),
      ...(modifiedBatch3 ?? []),
      ...(modifiedBatch4 ?? []),
    ];
    for (const item of allBatches) {
      map.set(item.source, computeMagnitude(item.oldContent, item.content));
    }
    return map;
  }, [modifiedBatch, modifiedBatch2, modifiedBatch3, modifiedBatch4]);

  const magnitudesLoading =
    modifiedSources.length > 0 && magnitudeMap.size < modifiedSources.length;

  // Stats
  const stats = useMemo(() => {
    const counts = {
      unchanged: 0,
      modified: 0,
      added: 0,
      removed: 0,
      no_comparison: 0,
      major: 0,
      minor: 0,
      trivial: 0,
    };
    for (const s of sections) {
      counts[s.status as keyof typeof counts]++;
      if (s.status === "modified") {
        const mag = magnitudeMap.get(s.source);
        if (mag) counts[mag.level]++;
      }
    }
    return counts;
  }, [sections, magnitudeMap]);

  // Filtered + searched sections, sorted by magnitude for modified
  const filteredSections = useMemo(() => {
    let filtered = sections;
    if (filterMode === "major") {
      filtered = filtered.filter(
        (s) =>
          s.status === "modified" &&
          magnitudeMap.get(s.source)?.level === "major"
      );
    } else if (filterMode === "minor") {
      filtered = filtered.filter(
        (s) =>
          s.status === "modified" &&
          magnitudeMap.get(s.source)?.level === "minor"
      );
    } else if (filterMode === "trivial") {
      filtered = filtered.filter(
        (s) =>
          s.status === "modified" &&
          magnitudeMap.get(s.source)?.level === "trivial"
      );
    } else if (filterMode === "added") {
      filtered = filtered.filter((s) => s.status === "added");
    } else if (filterMode === "removed") {
      filtered = filtered.filter((s) => s.status === "removed");
    } else if (filterMode === "unchanged") {
      filtered = filtered.filter((s) => s.status === "unchanged");
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.source.toLowerCase().includes(q)
      );
    }
    // Sort: added/removed first, then modified by magnitude, then unchanged
    return [...filtered].sort((a, b) => {
      const order: Record<string, number> = {
        added: 0,
        removed: 1,
        modified: 2,
        unchanged: 3,
        no_comparison: 4,
      };
      const ao = order[a.status] ?? 5;
      const bo = order[b.status] ?? 5;
      if (ao !== bo) return ao - bo;
      if (a.status === "modified" && b.status === "modified") {
        const magA = magnitudeMap.get(a.source)?.percentChanged ?? 0;
        const magB = magnitudeMap.get(b.source)?.percentChanged ?? 0;
        return magB - magA;
      }
      return 0;
    });
  }, [sections, filterMode, search, magnitudeMap]);

  function formatDate(ms: number) {
    return new Date(ms).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  async function handleFetch() {
    setIsFetching(true);
    try {
      await triggerFetch();
    } finally {
      setIsFetching(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-[1100px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-[15px] font-semibold text-gray-900">
              Admin Inspector
            </h1>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-gray-400 hover:text-gray-600"
              >
                Changes
              </Link>
              <Link
                href="/browse"
                className="text-sm font-medium text-gray-400 hover:text-gray-600"
              >
                Browse
              </Link>
              <span className="text-sm font-medium text-gray-900 border-b-2 border-gray-900 pb-0.5">
                Admin
              </span>
            </div>
          </div>
          <button
            onClick={handleFetch}
            disabled={isFetching}
            className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isFetching ? "Fetching..." : "Trigger Fetch"}
          </button>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-6">
        {/* Snapshot selectors */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Selected run */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Viewing Run
            </label>
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
              {snapshots?.map((snap) => (
                <button
                  key={snap._id}
                  onClick={() => setSelectedSnapshotId(snap._id)}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-gray-50 last:border-b-0 transition-colors ${
                    selectedId === snap._id
                      ? "bg-gray-900 text-white"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {formatDate(snap.fetchedAt)}
                    </span>
                    <span
                      className={`text-xs ${
                        selectedId === snap._id
                          ? "text-gray-300"
                          : "text-gray-400"
                      }`}
                    >
                      {snap.sectionCount} sections
                    </span>
                  </div>
                </button>
              ))}
              {!snapshots?.length && (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">
                  No runs yet. Click &quot;Trigger Fetch&quot; to start.
                </div>
              )}
            </div>
          </div>

          {/* Compare to */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Compare Against
            </label>
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
              <button
                onClick={() =>
                  setCompareToSnapshotId(
                    null as unknown as Id<"snapshots">
                  )
                }
                className={`w-full text-left px-3 py-2 text-sm border-b border-gray-50 transition-colors ${
                  !compareId
                    ? "bg-gray-900 text-white"
                    : "hover:bg-gray-50 text-gray-400"
                }`}
              >
                None (no comparison)
              </button>
              {snapshots
                ?.filter((s) => s._id !== selectedId)
                .map((snap) => (
                  <button
                    key={snap._id}
                    onClick={() => setCompareToSnapshotId(snap._id)}
                    className={`w-full text-left px-3 py-2 text-sm border-b border-gray-50 last:border-b-0 transition-colors ${
                      compareId === snap._id
                        ? "bg-gray-900 text-white"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {formatDate(snap.fetchedAt)}
                      </span>
                      <span
                        className={`text-xs ${
                          compareId === snap._id
                            ? "text-gray-300"
                            : "text-gray-400"
                        }`}
                      >
                        {snap.sectionCount} sections
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        {sections.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="font-medium text-gray-900">
                {sections.length} sections
              </span>
              {compareId && (
                <>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    {stats.unchanged} unchanged
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {stats.modified} modified
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {stats.added} added
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {stats.removed} removed
                  </span>
                </>
              )}
            </div>
            {compareId && stats.modified > 0 && (
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="text-gray-500 font-medium">
                  Modified breakdown:
                </span>
                {magnitudesLoading ? (
                  <span className="text-gray-400 italic">
                    Computing magnitudes ({magnitudeMap.size}/
                    {modifiedSources.length})...
                  </span>
                ) : (
                  <>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      {stats.major} major
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                      {stats.minor} minor
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      {stats.trivial} trivial
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Filter tabs + search */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            {(
              [
                { key: "all", label: "All" },
                { key: "major", label: "Major" },
                { key: "minor", label: "Minor" },
                { key: "trivial", label: "Trivial" },
                { key: "added", label: "Added" },
                { key: "removed", label: "Removed" },
                { key: "unchanged", label: "Unchanged" },
              ] as { key: FilterMode; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterMode(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filterMode === key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-[300px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sections..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
            />
          </div>

          <span className="text-xs text-gray-400">
            {filteredSections.length} shown
          </span>
        </div>

        {/* Sections list */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {filteredSections.length > 0 ? (
            filteredSections.map((section, i) => (
              <SectionRow
                key={`${section.source}-${i}`}
                section={section}
                magnitude={magnitudeMap.get(section.source)}
                snapshotId={selectedId!}
                compareSnapshotId={compareId}
              />
            ))
          ) : sections.length > 0 ? (
            <div className="px-4 py-8 text-sm text-gray-400 text-center">
              No sections match your filter.
            </div>
          ) : selectedId ? (
            <div className="px-4 py-8 text-sm text-gray-400 text-center">
              Loading sections...
            </div>
          ) : (
            <div className="px-4 py-8 text-sm text-gray-400 text-center">
              Select a run to view its sections.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
