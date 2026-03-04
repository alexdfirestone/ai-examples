"use client";

import { useChat } from "@ai-sdk/react";
import { WorkflowChatTransport } from "@workflow/ai";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Streamdown } from "streamdown";
import Link from "next/link";
import type { ExplanationMode } from "@/lib/system-prompts";

// ─── Types ───────────────────────────────────────────────────────────────────

const MODE_LABELS: Record<ExplanationMode, string> = {
  "5th-grader": "5th Grader",
  engineer: "Engineer",
  tldr: "TLDR",
};

interface Section {
  _id: string;
  title: string;
  description: string;
  source: string;
  lastUpdated: string;
}

interface TreeNode {
  segment: string;
  fullPath: string;
  section?: Section;
  children: TreeNode[];
}

// ─── Tree building ───────────────────────────────────────────────────────────

function buildTree(sections: Section[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const section of sections) {
    const path = section.source.replace("https://vercel.com/docs/", "");
    const segments = path.split("/").filter(Boolean);
    let currentLevel = root;
    let currentPath = "";

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      let existing = currentLevel.find((n) => n.segment === segment);
      if (!existing) {
        existing = {
          segment,
          fullPath: currentPath,
          children: [],
        };
        currentLevel.push(existing);
      }

      // Attach section at the exact matching path
      if (i === segments.length - 1) {
        existing.section = section;
      }

      currentLevel = existing.children;
    }
  }

  return root;
}

/** Collect all section source URLs in a subtree */
function getAllSources(node: TreeNode): string[] {
  const sources: string[] = [];
  if (node.section) sources.push(node.section.source);
  for (const child of node.children) {
    sources.push(...getAllSources(child));
  }
  return sources;
}

/** Count total doc sections in a subtree */
function countSections(node: TreeNode): number {
  let count = node.section ? 1 : 0;
  for (const child of node.children) {
    count += countSections(child);
  }
  return count;
}

/** Determine selection state: "all", "some", or "none" */
function getSelectionState(
  node: TreeNode,
  selected: Set<string>
): "all" | "some" | "none" {
  const sources = getAllSources(node);
  if (sources.length === 0) return "none";
  const selectedCount = sources.filter((s) => selected.has(s)).length;
  if (selectedCount === 0) return "none";
  if (selectedCount === sources.length) return "all";
  return "some";
}

/** Filter tree for search — returns null if no matches */
function filterTree(node: TreeNode, query: string): TreeNode | null {
  const q = query.toLowerCase();
  const sectionMatches =
    node.section &&
    (node.section.title.toLowerCase().includes(q) ||
      node.section.description.toLowerCase().includes(q) ||
      node.section.source.toLowerCase().includes(q));

  const filteredChildren = node.children
    .map((c) => filterTree(c, query))
    .filter(Boolean) as TreeNode[];

  if (sectionMatches || filteredChildren.length > 0) {
    return {
      ...node,
      children: filteredChildren,
    };
  }
  return null;
}

function filterForest(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query.trim()) return nodes;
  return nodes
    .map((n) => filterTree(n, query))
    .filter(Boolean) as TreeNode[];
}

/** Format a path segment for display: "code-review" → "Code Review" */
function formatSegment(segment: string): string {
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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
    return { success: false, stdout: "", stderr: String(output), exitCode: -1 };
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

// ─── Tree Node Row (recursive accordion) ─────────────────────────────────────

function TreeNodeRow({
  node,
  depth,
  selectedSources,
  onToggleSelect,
  onChatSection,
  expandedPaths,
  onToggleExpand,
  isSearching,
}: {
  node: TreeNode;
  depth: number;
  selectedSources: Set<string>;
  onToggleSelect: (node: TreeNode) => void;
  onChatSection: (section: Section) => void;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  isSearching: boolean;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = isSearching || expandedPaths.has(node.fullPath);
  const sectionCount = countSections(node);
  const selectionState = getSelectionState(node, selectedSources);
  const displayName = formatSegment(node.segment);

  return (
    <div>
      {/* This node's row */}
      <div
        className="flex items-center gap-2 group"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {/* Expand/collapse chevron */}
        {hasChildren ? (
          <button
            onClick={() => onToggleExpand(node.fullPath)}
            className="w-5 h-5 flex items-center justify-center flex-shrink-0 rounded hover:bg-gray-100 transition-colors"
          >
            <svg
              className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        ) : (
          <span className="w-5 h-5 flex-shrink-0" />
        )}

        {/* Checkbox */}
        <button
          onClick={() => onToggleSelect(node)}
          className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
            selectionState === "all"
              ? "bg-blue-600 border-blue-600"
              : selectionState === "some"
                ? "bg-blue-600 border-blue-600"
                : "border-gray-300 hover:border-gray-400"
          }`}
        >
          {selectionState === "all" && (
            <svg
              className="w-2.5 h-2.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          {selectionState === "some" && (
            <svg
              className="w-2.5 h-2.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 12h14"
              />
            </svg>
          )}
        </button>

        {/* Label — clickable to expand if has children, or to toggle select */}
        <button
          onClick={() => {
            if (hasChildren) {
              onToggleExpand(node.fullPath);
            } else {
              onToggleSelect(node);
            }
          }}
          className="flex-1 text-left min-w-0 py-2 flex items-center gap-2"
        >
          <span
            className={`text-sm truncate ${
              node.section
                ? "font-medium text-gray-800"
                : "font-semibold text-gray-500 uppercase text-xs tracking-wider"
            }`}
            title={node.section?.title}
          >
            {displayName}
          </span>
          {hasChildren && (
            <span className="text-[11px] text-gray-300 flex-shrink-0">
              {sectionCount} doc{sectionCount !== 1 ? "s" : ""}
            </span>
          )}
        </button>

        {/* Chat icon — only show for nodes that have a section */}
        {node.section && (
          <button
            onClick={() => onChatSection(node.section!)}
            className="flex-shrink-0 p-1.5 rounded hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
            title="Chat about this section"
          >
            <svg
              className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Description line for sections */}
      {node.section && node.section.description && (
        <div
          className="text-xs text-gray-400 truncate pb-1"
          style={{ paddingLeft: `${depth * 20 + 8 + 20 + 8 + 16 + 8}px` }}
        >
          {node.section.description}
        </div>
      )}

      {/* Children (when expanded) */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              selectedSources={selectedSources}
              onToggleSelect={onToggleSelect}
              onChatSection={onChatSection}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
              isSearching={isSearching}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Browse Page ────────────────────────────────────────────────────────

export default function BrowsePage() {
  const [mode, setMode] = useState<ExplanationMode>("engineer");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set()
  );
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all sections from Convex (latest snapshot)
  const sectionsResult = useQuery(api.queries.getLatestSections);

  // Fetch full content for selected sections
  const selectedSourcesArray = useMemo(
    () => Array.from(selectedSources),
    [selectedSources]
  );
  const selectedSectionsData = useQuery(
    api.queries.getSectionsBySource,
    selectedSourcesArray.length > 0 ? { sources: selectedSourcesArray } : "skip"
  );

  // Build tree from flat sections
  const tree = useMemo(() => {
    if (!sectionsResult?.sections) return [];
    return buildTree(sectionsResult.sections as Section[]);
  }, [sectionsResult?.sections]);

  // Filter tree when searching
  const filteredTree = useMemo(
    () => filterForest(tree, search),
    [tree, search]
  );

  const isSearching = search.trim().length > 0;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const activeRunId = useMemo(() => {
    if (typeof window === "undefined") return;
    return localStorage.getItem("docs-browse-run-id") ?? undefined;
  }, []);

  const transport = useMemo(
    () =>
      new WorkflowChatTransport({
        api: "/api/chat",
        body: {
          mode,
          chatMode: "browse",
          browseSections: selectedSectionsData ?? [],
        },
        onChatSendMessage: (response) => {
          const workflowRunId = response.headers.get("x-workflow-run-id");
          if (workflowRunId) {
            localStorage.setItem("docs-browse-run-id", workflowRunId);
          }
        },
        onChatEnd: () => {
          localStorage.removeItem("docs-browse-run-id");
        },
        prepareReconnectToStreamRequest: ({ api, ...rest }) => {
          const runId = localStorage.getItem("docs-browse-run-id");
          if (!runId) throw new Error("No active workflow run ID found");
          return {
            ...rest,
            api: `/api/chat/${encodeURIComponent(runId)}/stream`,
          };
        },
      }),
    [mode, selectedSectionsData]
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
    localStorage.removeItem("docs-browse-run-id");
    setMessages([]);
  };

  const handleToggleSelect = useCallback((node: TreeNode) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      const sources = getAllSources(node);
      const state = getSelectionState(node, prev);
      if (state === "all") {
        // Deselect all descendants
        for (const s of sources) next.delete(s);
      } else {
        // Select all descendants
        for (const s of sources) next.add(s);
      }
      return next;
    });
  }, []);

  const handleToggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Click a section → select it and auto-send a question
  const handleClickSection = useCallback(
    (section: Section) => {
      if (status !== "ready") return;
      setSelectedSources((prev) => {
        const next = new Set(prev);
        next.add(section.source);
        return next;
      });
      setTimeout(() => {
        sendMessage({
          text: `Explain the "${section.title}" section to me. (${section.source})`,
        });
      }, 100);
    },
    [status, sendMessage]
  );

  const isWorking = status === "streaming" || status === "submitted";
  const hasMessages = messages.length > 0;

  // Total section count
  const totalSections = sectionsResult?.sections?.length ?? 0;

  const inputComponent = (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative border border-gray-200 rounded-2xl shadow-sm focus-within:border-gray-400 focus-within:shadow-md transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about the selected docs..."
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
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Empty / Browse State */}
      {!hasMessages && (
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
            <div className="max-w-[900px] mx-auto px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-[22px] font-semibold text-gray-900">
                  Vercel Docs Learner
                </h1>
                {sectionsResult?.snapshotDate && (
                  <span className="text-xs text-gray-400">
                    Snapshot:{" "}
                    {new Date(sectionsResult.snapshotDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Nav */}
              <div className="flex items-center gap-4 mb-4">
                <Link
                  href="/"
                  className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors pb-0.5"
                >
                  Changes
                </Link>
                <span className="text-sm font-medium text-gray-900 border-b-2 border-gray-900 pb-0.5">
                  Browse All Docs
                </span>
                <Link
                  href="/admin"
                  className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors pb-0.5"
                >
                  Admin
                </Link>
              </div>

              {/* Controls row */}
              <div className="flex items-center gap-3">
                {/* Mode selector */}
                <div className="flex items-center gap-1">
                  {(
                    Object.entries(MODE_LABELS) as [ExplanationMode, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setMode(key)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        mode === key
                          ? "bg-gray-900 text-white"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="flex-1 relative">
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

                {/* Stats */}
                <span className="text-xs text-gray-300 flex-shrink-0">
                  {totalSections} docs
                </span>

                {/* Selected count */}
                {selectedSources.size > 0 && (
                  <span className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full flex-shrink-0">
                    {selectedSources.size} selected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tree list */}
          <div className="flex-1 overflow-auto">
            <div className="max-w-[900px] mx-auto px-6 py-4">
              {!sectionsResult ? (
                <div className="text-center text-sm text-gray-400 py-12">
                  Loading...
                </div>
              ) : !sectionsResult.hasData ? (
                <div className="text-center text-sm text-gray-400 py-12">
                  No snapshots yet. Go to Changes and fetch docs first.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {filteredTree.length > 0 ? (
                    filteredTree.map((node) => (
                      <TreeNodeRow
                        key={node.fullPath}
                        node={node}
                        depth={0}
                        selectedSources={selectedSources}
                        onToggleSelect={handleToggleSelect}
                        onChatSection={handleClickSection}
                        expandedPaths={expandedPaths}
                        onToggleExpand={handleToggleExpand}
                        isSearching={isSearching}
                      />
                    ))
                  ) : (
                    <div className="text-center text-sm text-gray-400 py-8">
                      No sections matching &quot;{search}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sticky input at bottom (only show when sections are selected) */}
          {selectedSources.size > 0 && (
            <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-white/0 pt-4 pb-4 border-t border-gray-100">
              <div className="max-w-[900px] mx-auto px-6">
                <div className="text-xs text-gray-400 mb-2">
                  {selectedSources.size} section
                  {selectedSources.size > 1 ? "s" : ""} selected — ask anything
                  about them
                </div>
                {inputComponent}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat State */}
      {hasMessages && (
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-100">
            <div className="max-w-[720px] mx-auto px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-[15px] font-semibold text-gray-900">
                  Docs Browser
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-500 rounded-full">
                  {MODE_LABELS[mode]}
                </span>
                <span className="px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-600 rounded-full">
                  {selectedSources.size} section
                  {selectedSources.size > 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={handleReset}
                className="px-2.5 py-1 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              >
                Back to browse
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
                    className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
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
                          return message.role === "assistant" ? (
                            <Streamdown
                              key={idx}
                              className="text-sm text-gray-700"
                            >
                              {part.text}
                            </Streamdown>
                          ) : (
                            <div
                              key={idx}
                              className="inline-block text-sm text-gray-900 leading-relaxed bg-gray-100 px-4 py-3 rounded-2xl"
                            >
                              {part.text}
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
                        <span>Reading docs...</span>
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

          {/* Input */}
          <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-white/0 pt-6 pb-6">
            <div className="max-w-[720px] mx-auto px-6">
              {inputComponent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
