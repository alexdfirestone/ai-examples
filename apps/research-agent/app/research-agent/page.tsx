"use client";

import { useChat } from "@ai-sdk/react";
import { WorkflowChatTransport } from "@workflow/ai";
import { useMemo, useState, useRef, useEffect } from "react";
import { DataPartRenderer } from "./components/DataPartRenderer";
import { MessagesDebug } from "./components/MessagesDebug";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import type { CustomDataPart } from "@/workflows/research/types";

// Notion-style tool approval card
function OutlineApprovalCard({
  toolCallId,
  input,
  onApprove,
}: {
  toolCallId: string;
  input?: { outlineTitle?: string; sectionCount?: number };
  onApprove: (toolCallId: string, approved: boolean) => void;
}) {
  // Track local submission state - this is the source of truth for UI
  const [submissionState, setSubmissionState] = useState<"pending" | "approving" | "rejecting" | "approved" | "rejected">("pending");

  // Show completed state (approved or rejected)
  if (submissionState === "approved" || submissionState === "rejected") {
    const isApproved = submissionState === "approved";
    return (
      <div className="my-3 py-2 px-3 flex items-center gap-2 text-[13px] text-[#37352f]/70">
        <svg 
          className={`w-4 h-4 ${isApproved ? "text-[#2eaadc]" : "text-[#37352f]/50"}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={2}
        >
          {isApproved ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          )}
        </svg>
        <span>{isApproved ? "Approved — continuing workflow" : "Rejected"}</span>
      </div>
    );
  }

  // Show submitting state
  if (submissionState === "approving" || submissionState === "rejecting") {
    return (
      <div className="my-3 py-2 px-3 flex items-center gap-2 text-[13px] text-[#37352f]/70">
        <svg className="w-4 h-4 animate-spin text-[#9b9a97]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
        <span>{submissionState === "approving" ? "Approving..." : "Rejecting..."}</span>
      </div>
    );
  }

  const handleSubmit = async (approved: boolean) => {
    setSubmissionState(approved ? "approving" : "rejecting");
    try {
      await onApprove(toolCallId, approved);
      // Set the final state after successful submission
      setSubmissionState(approved ? "approved" : "rejected");
    } catch {
      // Reset to pending on error
      setSubmissionState("pending");
    }
  };

  // Show pending approval card
  return (
    <div className="my-4 rounded-md border border-[#e3e3e1] bg-[#fbfbfa]">
      <div className="px-4 py-3 border-b border-[#e3e3e1]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#9b9a97]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-[13px] font-medium text-[#37352f]">Approval required</span>
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="text-[13px] text-[#37352f]/80 mb-3 leading-relaxed">
          Review the outline and approve to continue generating the report.
        </p>
        {input && (input.outlineTitle || input.sectionCount) && (
          <div className="text-[12px] text-[#37352f]/60 mb-4 py-2 px-3 bg-[#f7f6f3] rounded">
            {input.outlineTitle && <div>Title: {input.outlineTitle}</div>}
            {input.sectionCount && <div>Sections: {input.sectionCount}</div>}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubmit(true)}
            className="px-3 py-1.5 text-[13px] font-medium text-white bg-[#2eaadc] hover:bg-[#2898c6] rounded transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => handleSubmit(false)}
            className="px-3 py-1.5 text-[13px] font-medium text-[#37352f]/70 hover:bg-[#37352f]/5 rounded transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResearchAgentPage() {
  const [input, setInput] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as content changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [input]);

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
    onFinish: ({ message }) => {
      console.log("Chat finished:", message);
    },
  });

  const handleToolApprove = async (toolCallId: string, approved: boolean) => {
    try {
      await fetch("/api/chat/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolCallId, approved }),
      });
    } catch (err) {
      console.error("Failed to send approval:", err);
    }
  };

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
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (status === 'ready' && input.trim()) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  const handleReset = () => {
    localStorage.removeItem("active-workflow-run-id");
    setMessages([]);
  };

  const isWorking = status === "streaming" || status === "submitted";
  
  // Check if there's a pending approval (to hide working indicator while waiting for human input)
  const hasPendingApproval = useMemo(() => {
    return messages.some(msg => 
      msg.parts?.some((part: any) => 
        (part.type === "tool-requestOutlineApproval" && !part.output && !part.result) ||
        (part.type === "data-approval-request")
      )
    );
  }, [messages]);

  // Check if data parts are showing their own loading indicators
  const hasActiveDataPartLoading = useMemo(() => {
    return messages.some(msg => 
      msg.parts?.some((part: any) => 
        (part.type === "data-research-progress" && part.data?.status === "searching") ||
        (part.type === "data-section-progress" && part.data?.status === "writing")
      )
    );
  }, [messages]);

  const hasMessages = messages.length > 0;

  // Input component (shared between empty and chat states)
  const inputComponent = (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative bg-white border border-[#e3e3e1] rounded-2xl shadow-sm hover:border-[#d0d0d0] focus-within:border-[#37352f]/30 focus-within:shadow-md transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a research topic..."
          disabled={isWorking}
          rows={1}
          className="w-full px-4 py-3.5 pr-12 text-[15px] text-[#37352f] placeholder-[#9b9a97] bg-transparent border-none rounded-2xl focus:outline-none resize-none max-h-[160px] overflow-auto disabled:opacity-50"
        />
        
        <button
          type="submit"
          disabled={isWorking || !input.trim()}
          className="absolute bottom-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:bg-transparent disabled:text-[#d0d0d0] disabled:cursor-default bg-[#37352f] text-white hover:bg-[#1a1a1a]"
          title="Send"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M10 4L10 16M10 4L6 8M10 4L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Debug Panel */}
      {showDebug && (
        <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-xl z-50 flex flex-col border-l border-[#e3e3e1]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e3e3e1]">
            <span className="text-[13px] font-medium text-[#37352f]">Debug</span>
            <button
              onClick={() => setShowDebug(false)}
              className="p-1 hover:bg-[#37352f]/5 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-[#9b9a97]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <MessagesDebug messages={messages} status={status} />
        </div>
      )}

      {/* Debug toggle - always visible in corner */}
      {!showDebug && (
        <button
          onClick={() => setShowDebug(true)}
          className="fixed top-4 right-4 px-2.5 py-1 text-[11px] font-medium text-[#9b9a97] hover:text-[#37352f] hover:bg-[#f7f6f3] rounded transition-colors z-40"
        >
          Debug
        </button>
      )}

      {/* Empty State - Centered like ChatGPT */}
      {!hasMessages && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-32">
          <div className="w-full max-w-[640px] flex flex-col items-center">
            {/* Title */}
            <h1 className="text-[28px] font-semibold text-[#37352f] mb-8 text-center">
              Research Agent
            </h1>

            {/* Input */}
            <div className="w-full mb-4">
              {inputComponent}
            </div>

            {/* Example topics */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {["AI in Healthcare", "Sustainable Energy", "Future of Work"].map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setInput(topic)}
                  className="px-3 py-1.5 text-[13px] text-[#37352f]/70 border border-[#e3e3e1] hover:bg-[#f7f6f3] hover:border-[#d0d0d0] rounded-full transition-all"
                >
                  {topic}
                </button>
              ))}
            </div>

            {/* Subtitle */}
            <p className="mt-8 text-[13px] text-[#9b9a97] text-center">
              AI-powered research with human-in-the-loop approval
            </p>
          </div>
        </div>
      )}

      {/* Chat State - Traditional layout */}
      {hasMessages && (
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-[#e3e3e1]/50">
            <div className="max-w-[720px] mx-auto px-6 py-3 flex items-center justify-between">
              <h1 className="text-[15px] font-semibold text-[#37352f]">
                Research Agent
              </h1>
              <button
                onClick={handleReset}
                className="px-2.5 py-1 text-[12px] font-medium text-[#37352f]/60 hover:text-[#eb5757] hover:bg-[#eb5757]/5 rounded transition-colors"
              >
                New research
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto">
            <div className="max-w-[720px] mx-auto px-6 py-8">
              <div className="space-y-6">
                {messages.map((message) => (
            <div key={message.id} className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              {message.role === "user" ? (
                <div className="w-6 h-6 rounded-full bg-[#37352f] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[11px] font-medium text-white">Y</span>
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#f7f6f3] border border-[#e3e3e1] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-[#9b9a97]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              )}
              
              {/* Content */}
              <div className={`flex-1 min-w-0 ${message.role === "user" ? "text-right" : ""}`}>
                <div className="text-[12px] font-medium text-[#37352f] mb-1">
                  {message.role === "user" ? "You" : "Assistant"}
                </div>
                <Message from={message.role} className="max-w-full">
                  {message.parts?.map((part, idx) => {
                    if (part.type === "text") {
                      return (
                        <MessageContent key={idx} className={message.role === "user" ? "!p-0 !bg-transparent" : "!p-0 !bg-transparent"}>
                          {message.role === "assistant" ? (
                            <MessageResponse className="text-[14px] text-[#37352f]/80">
                              {part.text}
                            </MessageResponse>
                          ) : (
                            <div className="inline-block text-[14px] text-[#37352f] leading-relaxed bg-[#f7f6f3] px-4 py-3 rounded-2xl">
                              {part.text}
                            </div>
                          )}
                        </MessageContent>
                      );
                    }

                    const anyPart = part as any;
                    
                    if (anyPart.type === "tool-requestOutlineApproval") {
                      // Don't show interactive approval card if already resolved (has output)
                      if (anyPart.output || anyPart.state === "output-available") {
                        // Parse the output to determine the result
                        // Structure: { type: "tool-result", output: { type: "text", value: "{\"approved\":true,...}" } }
                        let approved = false;
                        try {
                          const parsed = JSON.parse(anyPart.output);
                          // The value field contains another JSON string with the actual result
                          const valueStr = parsed?.output?.value;
                          if (valueStr) {
                            const innerParsed = JSON.parse(valueStr);
                            approved = innerParsed?.approved ?? false;
                          }
                        } catch {
                          // ignore parse errors
                        }
                        
                        // Show completed state inline
                        return (
                          <div key={idx} className="my-3 py-2 px-3 flex items-center gap-2 text-[13px] text-[#37352f]/70">
                            <svg 
                              className={`w-4 h-4 ${approved ? "text-[#2eaadc]" : "text-[#37352f]/50"}`} 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor" 
                              strokeWidth={2}
                            >
                              {approved ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              )}
                            </svg>
                            <span>{approved ? "Approved — continuing workflow" : "Rejected"}</span>
                          </div>
                        );
                      }
                      
                      return (
                        <OutlineApprovalCard
                          key={idx}
                          toolCallId={anyPart.toolCallId}
                          input={anyPart.input || anyPart.args || {}}
                          onApprove={handleToolApprove}
                        />
                      );
                    }

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
                </Message>
              </div>
            </div>
          ))}

                {/* Working indicator - don't show while waiting for approval or when data parts show their own loading */}
                {isWorking && !hasPendingApproval && !hasActiveDataPartLoading && (
                  <div className="flex items-center gap-2 text-[13px] text-[#37352f]/50">
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span>Working...</span>
                  </div>
                )}

                {error && (
                  <div className="py-2 px-3 text-[13px] text-[#eb5757] bg-[#eb5757]/5 rounded border border-[#eb5757]/20">
                    {error.message}
                  </div>
                )}
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
