"use client";

import { useChat } from "@ai-sdk/react";
import { WorkflowChatTransport } from "@workflow/ai";
import { useMemo, useState } from "react";
import { DataPartRenderer } from "./components/DataPartRenderer";
import type { CustomDataPart } from "@/workflows/research/types";

export default function ResearchAgentPage() {
  const [input, setInput] = useState("");

  // Check for an active workflow run on mount
  const activeRunId = useMemo(() => {
    if (typeof window === "undefined") return;
    return localStorage.getItem("active-workflow-run-id") ?? undefined;
  }, []);

  const { messages, sendMessage, status, error } = useChat({
    resume: Boolean(activeRunId),
    transport: new WorkflowChatTransport({
      api: "/api/chat",
      // Store the run ID when a new chat starts
      onChatSendMessage: (response) => {
        const workflowRunId = response.headers.get("x-workflow-run-id");
        if (workflowRunId) {
          localStorage.setItem("active-workflow-run-id", workflowRunId);
        }
      },
      // Clear the run ID when the chat completes
      onChatEnd: () => {
        localStorage.removeItem("active-workflow-run-id");
      },
      // Use the stored run ID for reconnection
      prepareReconnectToStreamRequest: ({ api, ...rest }) => {
        const runId = localStorage.getItem("active-workflow-run-id");
        if (!runId) throw new Error("No active workflow run ID found");
        return {
          ...rest,
          api: `/api/chat/${encodeURIComponent(runId)}/stream`,
        };
      },
    }),
    onFinish: ({ message }) => {
      console.log("Chat finished:", message);
    },
  });

  const handleApprove = async (webhookUrl: string, approved: boolean) => {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
    } catch (err) {
      console.error("Failed to send approval:", err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === "ready") {
      sendMessage({ text: input });
      setInput("");
    }
  };

  const isWorking = status === "streaming" || status === "submitted";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Research Agent
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Durable AI workflow with streaming and human approval
          </p>
        </div>

        {/* Messages */}
        <div className="mb-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-4 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-500 text-white ml-12"
                  : "bg-white dark:bg-gray-800 mr-12 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {/* Text parts */}
              {message.parts?.map((part, idx) => {
                if (part.type === "text") {
                  return (
                    <div
                      key={idx}
                      className={`whitespace-pre-wrap ${
                        message.role === "user"
                          ? "text-white"
                          : "text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {part.text}
                    </div>
                  );
                }
                return null;
              })}

              {/* Data parts */}
              {message.parts?.map((part, idx) => {
                const anyPart = part as any;
                if (
                  anyPart.type === "data-research-progress" ||
                  anyPart.type === "data-outline" ||
                  anyPart.type === "data-approval-request" ||
                  anyPart.type === "data-section-progress" ||
                  anyPart.type === "data-report-complete"
                ) {
                  return (
                    <DataPartRenderer
                      key={idx}
                      part={anyPart as CustomDataPart}
                      onApprove={handleApprove}
                    />
                  );
                }
                return null;
              })}

            </div>
          ))}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
              Error: {error.message}
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="sticky bottom-6">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter a topic to research (e.g., 'Artificial Intelligence in Healthcare')"
              disabled={isWorking}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isWorking || !input.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isWorking ? "Working..." : "Research"}
            </button>
          </div>

          {/* Example topics */}
          {messages.length === 0 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Try these examples:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  "AI in Healthcare",
                  "Sustainable Energy",
                  "Future of Work",
                ].map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setInput(topic)}
                    className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full transition-colors"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
