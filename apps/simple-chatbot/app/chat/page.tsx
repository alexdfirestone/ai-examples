"use client";

import { useChat } from "@ai-sdk/react";
import { WorkflowChatTransport } from "@workflow/ai";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Streamdown } from "streamdown";

// --- Debug Panel ---

function JsonValue({ data, name, depth = 0 }: { data: any; name?: string; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const indent = depth * 14;

  if (data === null || data === undefined) {
    return (
      <div style={{ paddingLeft: indent }} className="font-mono text-[11px] leading-5">
        {name && <span className="text-gray-400">{name}: </span>}
        <span className="text-blue-500">{String(data)}</span>
      </div>
    );
  }

  if (typeof data === "string") {
    const display = data.length > 120 ? data.slice(0, 120) + "…" : data;
    return (
      <div style={{ paddingLeft: indent }} className="font-mono text-[11px] leading-5">
        {name && <span className="text-gray-400">{name}: </span>}
        <span className="text-rose-600">"{display}"</span>
      </div>
    );
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return (
      <div style={{ paddingLeft: indent }} className="font-mono text-[11px] leading-5">
        {name && <span className="text-gray-400">{name}: </span>}
        <span className="text-blue-500">{String(data)}</span>
      </div>
    );
  }

  const isArr = Array.isArray(data);
  const keys = isArr ? data : Object.keys(data);
  const count = isArr ? data.length : keys.length;

  if (count === 0) {
    return (
      <div style={{ paddingLeft: indent }} className="font-mono text-[11px] leading-5">
        {name && <span className="text-gray-400">{name}: </span>}
        <span className="text-gray-300">{isArr ? "[]" : "{}"}</span>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{ paddingLeft: indent }}
        className="font-mono text-[11px] leading-5 cursor-pointer select-none hover:bg-gray-50 rounded"
        onClick={() => setOpen(!open)}
      >
        <span className="text-gray-300 inline-block w-3 mr-0.5">{open ? "▾" : "▸"}</span>
        {name && <span className="text-gray-400">{name}: </span>}
        <span className="text-gray-300">
          {isArr ? `[${count}]` : `{${count}}`}
        </span>
      </div>
      {open &&
        (isArr
          ? data.map((item: any, i: number) => (
              <JsonValue key={i} data={item} name={String(i)} depth={depth + 1} />
            ))
          : keys.map((key: string) => (
              <JsonValue key={key} data={data[key]} name={key} depth={depth + 1} />
            )))}
    </div>
  );
}

function DebugPanel({
  messages,
  status,
  onClose,
}: {
  messages: any[];
  status: string;
  onClose: () => void;
}) {
  const [view, setView] = useState<"tree" | "raw">("tree");
  const [copied, setCopied] = useState(false);

  const stats = useMemo(
    () => ({
      total: messages.length,
      user: messages.filter((m: any) => m.role === "user").length,
      assistant: messages.filter((m: any) => m.role === "assistant").length,
      parts: messages.reduce((s: number, m: any) => s + (m.parts?.length || 0), 0),
    }),
    [messages]
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(messages, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [messages]);

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/80">
        <span className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
          Debug — useChat messages
        </span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-100 text-[11px] bg-gray-50/40">
        <span className="text-gray-400">msgs <span className="text-gray-700 font-medium">{stats.total}</span></span>
        <span className="text-gray-400">user <span className="text-gray-700 font-medium">{stats.user}</span></span>
        <span className="text-gray-400">ai <span className="text-gray-700 font-medium">{stats.assistant}</span></span>
        <span className="text-gray-400">parts <span className="text-gray-700 font-medium">{stats.parts}</span></span>
        <span className="ml-auto">
          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
            status === "streaming" ? "bg-green-100 text-green-700" :
            status === "submitted" ? "bg-yellow-100 text-yellow-700" :
            "bg-gray-100 text-gray-500"
          }`}>
            {status}
          </span>
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gray-100">
        <button
          onClick={() => setView(view === "tree" ? "raw" : "tree")}
          className="px-2 py-1 text-[11px] font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          {view === "tree" ? "Raw JSON" : "Tree View"}
        </button>
        <button
          onClick={handleCopy}
          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
            copied
              ? "bg-green-500 text-white"
              : "text-gray-500 bg-gray-100 hover:bg-gray-200"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-gray-300 text-xs py-12">
            No messages yet
          </div>
        ) : view === "tree" ? (
          <div className="bg-gray-50/50 border border-gray-100 rounded-lg p-2">
            <JsonValue data={messages} />
          </div>
        ) : (
          <pre className="bg-gray-50/50 border border-gray-100 rounded-lg p-3 text-[10px] leading-relaxed font-mono text-gray-600 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(messages, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// --- Inline Tool Call (rendered inside chat messages) ---

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

/** Extract the last path segment (filename) from a path string. */
function fileName(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

/** Extract the last positional arg (skip flags like -n 30) as the likely file target. */
function lastArg(cmd: string): string {
  const tokens = cmd.split(/\s+/);
  for (let i = tokens.length - 1; i >= 1; i--) {
    if (!tokens[i].startsWith("-") && !/^\d+$/.test(tokens[i])) return tokens[i];
  }
  return "";
}

/** Translate a raw bash command into a friendly, non-technical description. */
function describeCommand(cmd: string): string {
  const trimmed = cmd.trim();

  // Pipes — describe the first command in the pipeline
  if (trimmed.includes("|")) {
    const first = trimmed.split("|")[0].trim();
    return describeCommand(first);
  }

  // Chained commands — describe the first
  if (trimmed.includes("&&")) {
    const first = trimmed.split("&&")[0].trim();
    return describeCommand(first);
  }

  // Get the base command (first token)
  const base = trimmed.split(/\s+/)[0];

  switch (base) {
    // Filesystem navigation
    case "ls": {
      const target = lastArg(trimmed);
      return target ? `Listing files in ${target}` : "Listing files";
    }
    case "tree": {
      const target = lastArg(trimmed);
      return target ? `Browsing ${target} directory` : "Browsing directory tree";
    }
    case "find": {
      const nameMatch = trimmed.match(/-name\s+["']?([^"'\s]+)["']?/);
      return nameMatch ? `Finding files matching "${nameMatch[1]}"` : "Finding files";
    }
    case "pwd":
      return "Checking current directory";
    case "cd": {
      const target = lastArg(trimmed);
      return target ? `Navigating to ${target}` : "Navigating";
    }

    // Reading files
    case "cat": {
      const target = lastArg(trimmed);
      return target ? `Reading ${fileName(target)}` : "Reading file";
    }
    case "head": {
      const target = lastArg(trimmed);
      return target ? `Previewing ${fileName(target)}` : "Previewing file";
    }
    case "tail": {
      const target = lastArg(trimmed);
      return target ? `Reading end of ${fileName(target)}` : "Reading end of file";
    }
    case "less":
    case "more": {
      const target = lastArg(trimmed);
      return target ? `Viewing ${fileName(target)}` : "Viewing file";
    }

    // Searching
    case "grep":
    case "egrep":
    case "fgrep":
    case "rg": {
      const match = trimmed.match(/(?:grep|egrep|fgrep|rg)\s+(?:-[a-zA-Z]+\s+)*["']?([^"'\s]+)["']?/);
      const pattern = match?.[1] ?? "";
      return pattern ? `Searching for "${pattern}"` : "Searching files";
    }
    case "ag": {
      const match = trimmed.match(/ag\s+(?:-[a-zA-Z]+\s+)*["']?([^"'\s]+)["']?/);
      return match?.[1] ? `Searching for "${match[1]}"` : "Searching files";
    }

    // Data processing
    case "wc":
      return "Counting lines";
    case "sort":
      return "Sorting data";
    case "uniq":
      return "Filtering duplicates";
    case "awk":
    case "sed":
      return "Processing data";
    case "cut":
      return "Extracting columns";
    case "tr":
      return "Transforming text";
    case "jq":
      return "Parsing JSON";
    case "xargs":
      return "Processing items";
    case "tee":
      return "Splitting output";

    // File operations
    case "cp":
      return "Copying files";
    case "mv":
      return "Moving files";
    case "rm":
      return "Removing files";
    case "mkdir":
      return "Creating directory";
    case "touch":
      return "Creating file";
    case "chmod":
      return "Changing permissions";

    // Network
    case "curl":
    case "wget": {
      const urlMatch = trimmed.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        try {
          const host = new URL(urlMatch[0]).hostname;
          return `Fetching from ${host}`;
        } catch { /* fall through */ }
      }
      return "Fetching data";
    }

    // Runtime / scripts
    case "python":
    case "python3": {
      const target = lastArg(trimmed);
      return target && !target.startsWith("-")
        ? `Running ${fileName(target)}`
        : "Running Python";
    }
    case "node": {
      const target = lastArg(trimmed);
      return target && !target.startsWith("-")
        ? `Running ${fileName(target)}`
        : "Running JavaScript";
    }
    case "sh":
    case "bash": {
      const target = lastArg(trimmed);
      return target && !target.startsWith("-")
        ? `Running ${fileName(target)}`
        : "Running script";
    }

    // Info
    case "echo":
      return "Printing output";
    case "date":
      return "Checking date";
    case "whoami":
      return "Checking user";
    case "env":
    case "printenv":
      return "Checking environment";
    case "which":
    case "type":
      return "Looking up command";
    case "file": {
      const target = lastArg(trimmed);
      return target ? `Checking type of ${fileName(target)}` : "Checking file type";
    }
    case "diff":
      return "Comparing files";
    case "du":
      return "Checking disk usage";
    case "df":
      return "Checking disk space";

    default:
      return "Running a command";
  }
}

/** Derive a friendly label for any tool call part. */
function describeToolCall(part: any): string {
  const toolType = (part.type as string).replace(/^tool-/, "");

  // Bash / shell tools — use the command-level describer
  if (
    toolType === "bash_command" ||
    toolType === "bash" ||
    toolType === "shell" ||
    toolType === "run_command"
  ) {
    const cmd = part.input?.command ?? part.input?.cmd ?? "";
    return cmd ? describeCommand(cmd) : "Running a command";
  }

  // Generic: try to produce a readable label from the tool name
  const label = toolType.replace(/[_-]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  return `Using ${label}`;
}

/** Format raw detail line shown when expanded. */
function toolDetail(part: any): string | null {
  const toolType = (part.type as string).replace(/^tool-/, "");
  if (
    toolType === "bash_command" ||
    toolType === "bash" ||
    toolType === "shell" ||
    toolType === "run_command"
  ) {
    return part.input?.command ?? part.input?.cmd ?? null;
  }
  // For other tools, show the input as compact JSON
  if (part.input && Object.keys(part.input).length > 0) {
    return JSON.stringify(part.input, null, 2);
  }
  return null;
}

function ToolCallInline({ part }: { part: any }) {
  const [expanded, setExpanded] = useState(false);
  const friendlyLabel = useMemo(() => describeToolCall(part), [part]);
  const detail = useMemo(() => toolDetail(part), [part]);
  const isRunning = part.state === "running" || part.state === "partial-call";
  const result = useMemo(() => parseToolOutput(part.output), [part.output]);

  const toolType = (part.type as string).replace(/^tool-/, "");
  const isBash = ["bash_command", "bash", "shell", "run_command"].includes(toolType);

  return (
    <div className="my-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 py-1 px-2 -ml-2 rounded-md text-left group hover:bg-gray-50 transition-colors"
      >
        <span className={`text-[11px] text-gray-400 transition-transform select-none ${expanded ? "rotate-90" : ""}`}>
          ▶
        </span>
        <span className="text-[13px] text-gray-500 group-hover:text-gray-700 transition-colors">
          {friendlyLabel}
        </span>
        {isRunning && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
      </button>

      {expanded && (
        <div className="ml-5 mt-1.5 mb-1 pl-3 border-l-2 border-gray-100">
          {detail && (
            <code className="block text-[11px] font-mono text-gray-400 mb-2">
              {isBash ? `$ ${detail}` : detail}
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

// --- Main Page ---

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, [input]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const activeRunId = useMemo(() => {
    if (typeof window === "undefined") return;
    return localStorage.getItem("active-workflow-run-id") ?? undefined;
  }, []);

  const { messages, setMessages, sendMessage, status, error } = useChat({
    resume: Boolean(activeRunId),
    transport: new WorkflowChatTransport({
      api: "/api/chat",
      onChatSendMessage: (response) => {
        const workflowRunId = response.headers.get("x-workflow-run-id");
        if (workflowRunId) {
          localStorage.setItem("active-workflow-run-id", workflowRunId);
        }
      },
      onChatEnd: () => {
        localStorage.removeItem("active-workflow-run-id");
      },
      prepareReconnectToStreamRequest: ({ api, ...rest }) => {
        const runId = localStorage.getItem("active-workflow-run-id");
        if (!runId) throw new Error("No active workflow run ID found");
        return {
          ...rest,
          api: `/api/chat/${encodeURIComponent(runId)}/stream`,
        };
      },
    }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === "ready") {
      sendMessage({ text: input });
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (status === "ready" && input.trim()) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  const handleReset = () => {
    localStorage.removeItem("active-workflow-run-id");
    setMessages([]);
  };

  const isWorking = status === "streaming" || status === "submitted";
  const hasMessages = messages.length > 0;

  const inputComponent = (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative border border-gray-200 rounded-2xl shadow-sm focus-within:border-gray-400 focus-within:shadow-md transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
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
      {/* Debug toggle — always in top-right corner */}
      {!showDebug && (
        <button
          onClick={() => setShowDebug(true)}
          className="fixed top-3 right-3 z-40 px-2 py-1 text-[10px] font-mono font-medium text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded transition-colors"
        >
          debug
        </button>
      )}

      {/* Debug panel */}
      {showDebug && (
        <DebugPanel
          messages={messages}
          status={status}
          onClose={() => setShowDebug(false)}
        />
      )}

      {/* Empty State */}
      {!hasMessages && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-32">
          <div className="w-full max-w-[640px] flex flex-col items-center">
            <h1 className="text-[28px] font-semibold text-gray-900 mb-2 text-center">
              Data Assistant
            </h1>
            <p className="text-sm text-gray-400 mb-8 text-center">
              Ask questions and the agent will explore the data to find answers
            </p>
            <div className="w-full mb-4">{inputComponent}</div>

            {/* Example queries */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {[
                "What data is available?",
                "Summarize the key findings",
                "Show me the highlights",
              ].map((query) => (
                <button
                  key={query}
                  type="button"
                  onClick={() => setInput(query)}
                  className="px-3 py-1.5 text-[13px] text-gray-500 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-full transition-all"
                >
                  {query}
                </button>
              ))}
            </div>

            <p className="mt-8 text-xs text-gray-300 text-center">
              Powered by Vercel Workflows + AI SDK + Sandbox
            </p>
          </div>
        </div>
      )}

      {/* Chat State */}
      {hasMessages && (
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-100">
            <div className="max-w-[720px] mx-auto px-6 py-3 flex items-center justify-between">
              <h1 className="text-[15px] font-semibold text-gray-900">
                Data Assistant
              </h1>
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
                    {/* Avatar */}
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
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Content */}
                    <div
                      className={`flex-1 min-w-0 ${
                        message.role === "user" ? "text-right" : ""
                      }`}
                    >
                      <div className="text-xs font-medium text-gray-900 mb-1">
                        {message.role === "user" ? "You" : "Assistant"}
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
                        if (typeof part.type === "string" && part.type.startsWith("tool-")) {
                          return <ToolCallInline key={idx} part={part} />;
                        }
                        return null;
                      })}
                    </div>
                  </div>
                ))}

                {/* Working indicator — only show when waiting, not while content is streaming */}
                {isWorking && (() => {
                  const lastMsg = messages[messages.length - 1];
                  const hasContent = lastMsg?.role === "assistant" &&
                    lastMsg.parts?.some((p: any) =>
                      (p.type === "text" && p.text?.length > 0) ||
                      (typeof p.type === "string" && p.type.startsWith("tool-"))
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
                      <span>Thinking...</span>
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
              {inputComponent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
