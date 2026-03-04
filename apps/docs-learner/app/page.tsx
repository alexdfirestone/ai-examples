"use client";

import { useChat } from "@ai-sdk/react";
import { WorkflowChatTransport } from "@workflow/ai";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useState, useRef, useEffect } from "react";
import { Streamdown } from "streamdown";
import Link from "next/link";
import { diffLines } from "diff";
import type { ExplanationMode } from "@/lib/system-prompts";

// ─── Types ───────────────────────────────────────────────────────────────────

type Period = "1d" | "1w" | "1m" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  "1d": "1 Day",
  "1w": "1 Week",
  "1m": "1 Month",
  all: "All Time",
};

const MODE_LABELS: Record<ExplanationMode, string> = {
  "5th-grader": "5th Grader",
  engineer: "Engineer",
  tldr: "TLDR",
};

const MODE_ORDER: ExplanationMode[] = ["engineer", "5th-grader", "tldr"];

type MagnitudeLevel = "major" | "minor" | "trivial";
type ChangeFilter = MagnitudeLevel | "added" | "removed";

// ─── Magnitude computation ───────────────────────────────────────────────────

function computeMagnitude(
  oldContent: string | undefined,
  newContent: string | undefined
): MagnitudeLevel {
  if (!oldContent || !newContent) return "major"; // added/removed = major
  const changes = diffLines(oldContent, newContent);
  let linesAdded = 0;
  let linesRemoved = 0;
  let totalOld = 0;
  for (const part of changes) {
    const lineCount = part.value.split("\n").filter((l) => l.length > 0).length;
    if (part.added) linesAdded += lineCount;
    else if (part.removed) linesRemoved += lineCount;
    if (!part.added) totalOld += lineCount;
  }
  const totalChanged = linesAdded + linesRemoved;
  const pct = (totalChanged / Math.max(totalOld, 1)) * 100;
  if (totalChanged <= 3) return "trivial";
  if (totalChanged <= 15 && pct < 10) return "minor";
  return "major";
}

// ─── Tool Call Rendering ─────────────────────────────────────────────────────

function parseToolOutput(output: string | undefined) {
  if (!output) return null;
  try {
    const parsed = JSON.parse(output);
    const value =
      typeof parsed?.output?.value === "string"
        ? JSON.parse(parsed.output.value)
        : parsed?.output?.value ?? parsed;
    return {
      success: value?.success ?? value?.exitCode === 0,
      stdout: (value?.stdout ?? "") as string,
      stderr: (value?.stderr ?? "") as string,
      exitCode: (value?.exitCode ?? -1) as number,
    };
  } catch {
    return {
      success: false,
      stdout: "",
      stderr: String(output),
      exitCode: -1,
    };
  }
}

function describeCommand(cmd: string): string {
  const trimmed = cmd.trim();
  if (trimmed.includes("|"))
    return describeCommand(trimmed.split("|")[0].trim());
  if (trimmed.includes("&&"))
    return describeCommand(trimmed.split("&&")[0].trim());
  const base = trimmed.split(/\s+/)[0];
  const lastToken =
    trimmed
      .split(/\s+/)
      .filter((t) => !t.startsWith("-"))
      .pop() ?? "";
  switch (base) {
    case "ls":
      return lastToken ? `Listing ${lastToken}` : "Listing files";
    case "cat":
      return lastToken
        ? `Reading ${lastToken.split("/").pop()}`
        : "Reading file";
    case "head":
      return lastToken
        ? `Previewing ${lastToken.split("/").pop()}`
        : "Previewing file";
    case "diff":
      return "Comparing files";
    case "grep":
    case "rg": {
      const match = trimmed.match(
        /(?:grep|rg)\s+(?:-[a-zA-Z]+\s+)*["']?([^"'\s]+)["']?/
      );
      return match?.[1] ? `Searching for "${match[1]}"` : "Searching files";
    }
    case "wc":
      return "Counting lines";
    case "sort":
      return "Sorting data";
    case "find":
      return "Finding files";
    default:
      return "Running command";
  }
}

function ToolCallInline({ part }: { part: any }) {
  const [expanded, setExpanded] = useState(false);
  const cmd = part.input?.command ?? part.input?.cmd ?? "";
  const label = useMemo(
    () => (cmd ? describeCommand(cmd) : "Running tool"),
    [cmd]
  );
  const isRunning = part.state === "running" || part.state === "partial-call";
  const result = useMemo(() => parseToolOutput(part.output), [part.output]);

  return (
    <div className="my-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 py-1 px-2 -ml-2 rounded-md text-left group hover:bg-gray-50 transition-colors"
      >
        <span
          className={`text-[11px] text-gray-400 transition-transform select-none ${expanded ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        <span className="text-[13px] text-gray-500 group-hover:text-gray-700 transition-colors">
          {label}
        </span>
        {isRunning && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
      </button>
      {expanded && (
        <div className="ml-5 mt-1.5 mb-1 pl-3 border-l-2 border-gray-100">
          {cmd && (
            <code className="block text-[11px] font-mono text-gray-400 mb-2">
              $ {cmd}
            </code>
          )}
          {result ? (
            <>
              {result.stdout && (
                <pre className="text-[11px] leading-relaxed font-mono text-gray-600 whitespace-pre-wrap max-h-[200px] overflow-auto">
                  {result.stdout}
                </pre>
              )}
              {result.stderr && (
                <pre className="text-[11px] leading-relaxed font-mono text-red-400 whitespace-pre-wrap max-h-[100px] overflow-auto">
                  {result.stderr}
                </pre>
              )}
            </>
          ) : (
            <span className="text-[11px] text-gray-400">...</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DocsLearnerPage() {
  const [period, setPeriod] = useState<Period>("1d");
  const [mode, setMode] = useState<ExplanationMode>("engineer");
  const [input, setInput] = useState("");
  const [changesOpen, setChangesOpen] = useState(false);
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>("major");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const periodMenuRef = useRef<HTMLDivElement>(null);

  const [fetching, setFetching] = useState(false);
  const triggerFetch = useAction(api.snapshots.triggerFetch);

  // Fetch changes from Convex
  const changesResult = useQuery(api.queries.getChangedSections, { period });

  // Classify changes by magnitude
  const classifiedChanges = useMemo(() => {
    if (!changesResult?.changes) return [];
    return changesResult.changes.map((c: any) => ({
      ...c,
      magnitude: computeMagnitude(c.oldContent, c.newContent),
    }));
  }, [changesResult?.changes]);

  const filterCounts = useMemo(() => {
    const counts = { major: 0, minor: 0, trivial: 0, added: 0, removed: 0 };
    for (const c of classifiedChanges) {
      if (c.type === "added") counts.added++;
      else if (c.type === "removed") counts.removed++;
      else counts[c.magnitude as MagnitudeLevel]++;
    }
    return counts;
  }, [classifiedChanges]);

  const filteredChanges = useMemo(
    () =>
      classifiedChanges.filter((c: any) => {
        if (changeFilter === "added") return c.type === "added";
        if (changeFilter === "removed") return c.type === "removed";
        // magnitude filters only apply to modified
        return c.type === "modified" && c.magnitude === changeFilter;
      }),
    [classifiedChanges, changeFilter]
  );

  // Group filtered changes by top-level slug
  const groupedChanges = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const change of filteredChanges) {
      const path = change.source.replace("https://vercel.com/docs/", "");
      const topLevel = path.split("/")[0] || "root";
      if (!groups[topLevel]) groups[topLevel] = [];
      groups[topLevel].push(change);
    }
    return Object.entries(groups);
  }, [filteredChanges]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const handleTriggerFetch = async () => {
    setFetching(true);
    try {
      await triggerFetch();
    } catch (e) {
      console.error("Fetch failed:", e);
    } finally {
      setFetching(false);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, [input]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  // Close menus on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        modeMenuRef.current &&
        !modeMenuRef.current.contains(e.target as Node)
      ) {
        setShowModeMenu(false);
      }
      if (
        periodMenuRef.current &&
        !periodMenuRef.current.contains(e.target as Node)
      ) {
        setShowPeriodMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeRunId = useMemo(() => {
    if (typeof window === "undefined") return;
    return localStorage.getItem("docs-learner-run-id") ?? undefined;
  }, []);

  // Lightweight metadata for transport body — no content blobs
  const lightweightChanges = useMemo(
    () =>
      (changesResult?.changes ?? []).map((c: any) => ({
        type: c.type,
        title: c.title,
        source: c.source,
        description: c.description,
        lastUpdated: c.lastUpdated,
      })),
    [changesResult?.changes]
  );

  const transport = useMemo(
    () =>
      new WorkflowChatTransport({
        api: "/api/chat",
        body: {
          mode,
          changedSections: lightweightChanges,
        },
        onChatSendMessage: (response) => {
          const workflowRunId = response.headers.get("x-workflow-run-id");
          if (workflowRunId) {
            localStorage.setItem("docs-learner-run-id", workflowRunId);
          }
        },
        onChatEnd: () => {
          localStorage.removeItem("docs-learner-run-id");
        },
        prepareReconnectToStreamRequest: ({ api, ...rest }) => {
          const runId = localStorage.getItem("docs-learner-run-id");
          if (!runId) throw new Error("No active workflow run ID found");
          return {
            ...rest,
            api: `/api/chat/${encodeURIComponent(runId)}/stream`,
          };
        },
      }),
    [mode, lightweightChanges]
  );

  const { messages, setMessages, sendMessage, status, error } = useChat({
    resume: Boolean(activeRunId),
    transport,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === "ready") {
      sendMessage({ text: input });
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (status === "ready" && input.trim())
        handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleReset = () => {
    localStorage.removeItem("docs-learner-run-id");
    setMessages([]);
  };

  const handleClickChange = (change: any) => {
    if (status !== "ready") return;
    const verb =
      change.type === "added"
        ? "What is the new"
        : change.type === "removed"
          ? "What was removed from"
          : "What changed in";

    // Build the visible question
    let text = `${verb} "${change.title}" section? (${change.source})`;

    // Embed the actual content so the workflow can write it to the sandbox.
    // The UI and model messages strip this block before display/inference.
    const payload: Record<string, string> = {
      source: change.source,
      type: change.type,
      title: change.title,
    };
    if (change.oldContent) payload.oldContent = change.oldContent;
    if (change.newContent) payload.newContent = change.newContent;
    text += `\n\n---CHANGE_CONTENT_START---\n${JSON.stringify(payload)}\n---CHANGE_CONTENT_END---`;

    sendMessage({ text });
  };

  const isWorking = status === "streaming" || status === "submitted";
  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen bg-white">
      {/* ── Empty State ── */}
      {!hasMessages && (
        <div className="min-h-screen flex flex-col px-6">
          {/* Top nav bar */}
          <div className="flex items-center justify-between py-4 max-w-[600px] w-full mx-auto">
            <div />
            <div className="flex items-center gap-1">
              {/* Changes — current page (active) */}
              <span
                className="p-2 rounded-lg text-gray-900"
                title="Changes"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </span>
              {/* Browse */}
              <Link
                href="/browse"
                className="p-2 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                title="Browse Docs"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </Link>
              {/* Admin */}
              <Link
                href="/admin"
                className="p-2 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                title="Admin"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Centered content */}
          <div className="flex-1 flex flex-col items-center justify-center pb-24">
          <div className="w-full max-w-[600px] flex flex-col items-center">
            {/* Title */}
            <h1 className="text-[26px] font-semibold text-gray-900 mb-1 text-center">
              Vercel Docs Learner
            </h1>
            <p className="text-sm text-gray-400 mb-8 text-center">
              Ask about what changed in the Vercel documentation
            </p>

            {/* ── Chat input with inline mode selector ── */}
            <form onSubmit={handleSubmit} className="w-full mb-4">
              <div className="relative border border-gray-200 rounded-2xl shadow-sm focus-within:border-gray-400 focus-within:shadow-md transition-all">
                {/* Top row: mode picker */}
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  {/* Mode selector */}
                  <div className="relative" ref={modeMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowModeMenu(!showModeMenu)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {MODE_LABELS[mode]}
                      <svg
                        className="w-3 h-3 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {showModeMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
                        {MODE_ORDER.map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setMode(key);
                              setShowModeMenu(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                              mode === key
                                ? "text-gray-900 font-medium bg-gray-50"
                                : "text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {MODE_LABELS[key]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about docs changes..."
                  disabled={isWorking}
                  rows={1}
                  className="w-full px-4 py-2 pr-12 text-[15px] text-gray-900 placeholder-gray-400 bg-transparent border-none rounded-b-2xl focus:outline-none resize-none max-h-[160px] overflow-auto disabled:opacity-50"
                />

                {/* Send button */}
                <button
                  type="submit"
                  disabled={isWorking || !input.trim()}
                  className="absolute bottom-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:bg-transparent disabled:text-gray-300 disabled:cursor-default bg-gray-900 text-white hover:bg-gray-700"
                  title="Send"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10 4L10 16M10 4L6 8M10 4L14 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </form>

            {/* ── Changes panel ── */}
            {changesResult && changesResult.hasData && !changesResult.isFirstSnapshot && (
              <div className="w-full mb-6">
                {/* Summary bar — always visible */}
                <button
                  onClick={() => setChangesOpen(!changesOpen)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <span className="text-sm text-gray-600 flex items-center gap-3">
                    {filterCounts.added > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-green-700 font-medium">{filterCounts.added} added</span>
                      </span>
                    )}
                    {filterCounts.major > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        <span className="font-medium">{filterCounts.major} major</span>
                      </span>
                    )}
                    {filterCounts.minor > 0 && (
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                        {filterCounts.minor} minor
                      </span>
                    )}
                    {filterCounts.trivial > 0 && (
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        {filterCounts.trivial} trivial
                      </span>
                    )}
                    {filterCounts.removed > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span className="text-red-600 font-medium">{filterCounts.removed} removed</span>
                      </span>
                    )}
                  </span>

                  {/* Period selector */}
                  <div
                    className="relative ml-auto"
                    ref={periodMenuRef}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPeriodMenu(!showPeriodMenu);
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-400 hover:text-gray-600 rounded transition-colors"
                    >
                      {PERIOD_LABELS[period]}
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {showPeriodMenu && (
                      <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[100px]">
                        {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(
                          ([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                setPeriod(key);
                                setShowPeriodMenu(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                                period === key
                                  ? "text-gray-900 font-medium bg-gray-50"
                                  : "text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              {label}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expand chevron */}
                  <svg
                    className={`w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-transform flex-shrink-0 ${
                      changesOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Expanded panel */}
                {changesOpen && (
                  <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden">
                    {/* Filter tabs */}
                    <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-100">
                      {(
                        [
                          { key: "added" as ChangeFilter, label: "Added", count: filterCounts.added, dot: "bg-green-500" },
                          { key: "major" as ChangeFilter, label: "Major", count: filterCounts.major, dot: "bg-orange-400" },
                          { key: "minor" as ChangeFilter, label: "Minor", count: filterCounts.minor, dot: "bg-yellow-400" },
                          { key: "trivial" as ChangeFilter, label: "Trivial", count: filterCounts.trivial, dot: "bg-gray-300" },
                          { key: "removed" as ChangeFilter, label: "Removed", count: filterCounts.removed, dot: "bg-red-500" },
                        ] as const
                      ).map(({ key, label, count, dot }) => (
                        <button
                          key={key}
                          onClick={() => setChangeFilter(key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            changeFilter === key
                              ? "bg-white text-gray-900 shadow-sm"
                              : "text-gray-400 hover:text-gray-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${dot}`}
                          />
                          {label}
                          <span className="text-gray-300">{count}</span>
                        </button>
                      ))}

                      {/* Fetch button — tucked into tab bar */}
                      <button
                        onClick={handleTriggerFetch}
                        disabled={fetching}
                        className="ml-auto px-2 py-1 text-[10px] font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                      >
                        {fetching ? "Fetching..." : "Refresh"}
                      </button>
                    </div>

                    {/* Changes list — grouped by top-level slug */}
                    <div className="max-h-[340px] overflow-auto">
                      {groupedChanges.length > 0 ? (
                        groupedChanges.map(([group, changes]) => {
                          const isCollapsed = collapsedGroups.has(group);
                          const label = group
                            .replace(/-/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase());
                          return (
                            <div key={group}>
                              {/* Group header */}
                              <button
                                onClick={() => toggleGroup(group)}
                                className="w-full flex items-center gap-2 text-xs font-medium text-gray-500 px-4 py-2 bg-gray-50/80 hover:bg-gray-100/80 transition-colors border-b border-gray-100 sticky top-0 z-10"
                              >
                                <svg
                                  className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${
                                    isCollapsed ? "" : "rotate-90"
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
                                <span className="truncate">{label}</span>
                                <span className="text-[10px] text-gray-300 font-normal ml-auto flex-shrink-0">
                                  {changes.length}
                                </span>
                              </button>
                              {/* Group items */}
                              {!isCollapsed &&
                                changes.map((change: any, i: number) => {
                                  // Show sub-path (everything after the top-level slug)
                                  const fullPath = change.source.replace(
                                    "https://vercel.com/docs/",
                                    ""
                                  );
                                  const segments = fullPath.split("/");
                                  const subPath =
                                    segments.length > 1
                                      ? segments
                                          .slice(1)
                                          .map((s: string) =>
                                            s
                                              .replace(/-/g, " ")
                                              .replace(/\b\w/g, (c: string) =>
                                                c.toUpperCase()
                                              )
                                          )
                                          .join(" › ")
                                      : change.title;
                                  return (
                                    <button
                                      key={i}
                                      onClick={() => handleClickChange(change)}
                                      title={change.title}
                                      className="w-full flex items-center gap-2.5 text-xs py-2 px-4 pl-9 text-left hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-b-0"
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                          change.type === "added"
                                            ? "bg-green-500"
                                            : change.type === "removed"
                                              ? "bg-red-500"
                                              : change.magnitude === "major"
                                                ? "bg-orange-400"
                                                : change.magnitude === "minor"
                                                  ? "bg-yellow-400"
                                                  : "bg-gray-300"
                                        }`}
                                      />
                                      <span className="text-gray-700 truncate group-hover:text-gray-900 flex-1">
                                        {subPath}
                                      </span>
                                      <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                                          change.type === "added"
                                            ? "text-green-600 bg-green-50"
                                            : change.type === "removed"
                                              ? "text-red-600 bg-red-50"
                                              : change.magnitude === "major"
                                                ? "text-orange-600 bg-orange-50"
                                                : change.magnitude === "minor"
                                                  ? "text-yellow-600 bg-yellow-50"
                                                  : "text-gray-500 bg-gray-100"
                                        }`}
                                      >
                                        {change.type === "modified"
                                          ? change.magnitude
                                          : change.type}
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-6 text-center text-xs text-gray-400">
                          No {changeFilter} changes in this period
                        </div>
                      )}
                    </div>

                    {groupedChanges.length > 0 && (
                      <div className="px-4 py-1.5 text-center text-[10px] text-gray-300 border-t border-gray-100">
                        Click any item to ask about it
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Loading / empty states */}
            {!changesResult && (
              <div className="text-xs text-gray-300 mb-6">Loading changes...</div>
            )}
            {changesResult && !changesResult.hasData && (
              <div className="text-xs text-gray-400 mb-4">
                No snapshots yet.{" "}
                <button
                  onClick={handleTriggerFetch}
                  disabled={fetching}
                  className="underline hover:text-gray-600"
                >
                  {fetching ? "Fetching..." : "Fetch docs now"}
                </button>
              </div>
            )}
            {changesResult && changesResult.isFirstSnapshot && (
              <div className="text-xs text-gray-400 mb-4">
                First snapshot captured. Changes will appear after the next fetch.
              </div>
            )}

          </div>
          </div>
        </div>
      )}

      {/* ── Chat State ── */}
      {hasMessages && (
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-100">
            <div className="max-w-[720px] mx-auto px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-[15px] font-semibold text-gray-900">
                  Docs Learner
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-500 rounded-full">
                  {MODE_LABELS[mode]}
                </span>
                <span className="px-2 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-500 rounded-full">
                  {PERIOD_LABELS[period]}
                </span>
              </div>
              <button
                onClick={handleReset}
                className="px-2.5 py-1 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              >
                New chat
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto">
            <div className="max-w-[720px] mx-auto px-6 py-8">
              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${
                      message.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    {message.role === "user" ? (
                      <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[11px] font-medium text-white">
                          Y
                        </span>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg
                          className="w-3.5 h-3.5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                      </div>
                    )}

                    <div
                      className={`flex-1 min-w-0 ${message.role === "user" ? "text-right" : ""}`}
                    >
                      <div className="text-xs font-medium text-gray-900 mb-1">
                        {message.role === "user" ? "You" : "Docs Assistant"}
                      </div>
                      {message.parts?.map((part: any, idx: number) => {
                        if (part.type === "text") {
                          // Strip embedded change content from display
                          const displayText = part.text
                            .replace(
                              /\n\n---CHANGE_CONTENT_START---[\s\S]*?---CHANGE_CONTENT_END---/g,
                              ""
                            )
                            .trim();
                          return message.role === "assistant" ? (
                            <Streamdown
                              key={idx}
                              className="text-sm text-gray-700"
                            >
                              {displayText}
                            </Streamdown>
                          ) : (
                            <div
                              key={idx}
                              className="inline-block text-sm text-gray-900 leading-relaxed bg-gray-100 px-4 py-3 rounded-2xl"
                            >
                              {displayText}
                            </div>
                          );
                        }
                        if (
                          typeof part.type === "string" &&
                          part.type.startsWith("tool-")
                        ) {
                          return <ToolCallInline key={idx} part={part} />;
                        }
                        return null;
                      })}
                    </div>
                  </div>
                ))}

                {/* Working indicator */}
                {isWorking &&
                  (() => {
                    const lastMsg = messages[messages.length - 1];
                    const hasContent =
                      lastMsg?.role === "assistant" &&
                      lastMsg.parts?.some(
                        (p: any) =>
                          (p.type === "text" && p.text?.length > 0) ||
                          (typeof p.type === "string" &&
                            p.type.startsWith("tool-"))
                      );
                    if (hasContent) return null;
                    return (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <svg
                          className="w-3.5 h-3.5 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>Exploring docs...</span>
                      </div>
                    );
                  })()}

                {error && (
                  <div className="py-2 px-3 text-sm text-red-500 bg-red-50 rounded border border-red-100">
                    {error.message}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* Input - sticky at bottom */}
          <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-white/0 pt-6 pb-6">
            <div className="max-w-[720px] mx-auto px-6">
              <form onSubmit={handleSubmit} className="w-full">
                <div className="relative border border-gray-200 rounded-2xl shadow-sm focus-within:border-gray-400 focus-within:shadow-md transition-all">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about docs changes..."
                    disabled={isWorking}
                    rows={1}
                    className="w-full px-4 py-3.5 pr-12 text-[15px] text-gray-900 placeholder-gray-400 bg-transparent border-none rounded-2xl focus:outline-none resize-none max-h-[160px] overflow-auto disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isWorking || !input.trim()}
                    className="absolute bottom-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:bg-transparent disabled:text-gray-300 disabled:cursor-default bg-gray-900 text-white hover:bg-gray-700"
                    title="Send"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M10 4L10 16M10 4L6 8M10 4L14 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
