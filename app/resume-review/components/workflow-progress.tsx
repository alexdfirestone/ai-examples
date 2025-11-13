"use client";

import { useState, useEffect } from "react";

interface WorkflowStep {
  name: string;
  status: "pending" | "running" | "completed" | "error" | "waiting";
  message?: string;
  webhookUrl?: string;
  approvalData?: {
    candidateId: string;
    snippets: any;
    score: number;
  };
  toolCalls?: Array<{
    name: string;
    description: string;
    timestamp: number;
  }>;
}

interface WorkflowProgressProps {
  steps: WorkflowStep[];
}

export function WorkflowProgress({ steps }: WorkflowProgressProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [visibleSteps, setVisibleSteps] = useState<number>(0);
  const [approvingStep, setApprovingStep] = useState<number | null>(null);

  // Animate steps appearing one by one
  useEffect(() => {
    // Find the index of the last step that has started (running, completed, or error)
    let lastActiveIndex = -1;
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].status !== "pending") {
        lastActiveIndex = i;
        break;
      }
    }
    
    // We want to show up to the last active step, plus one more (the next pending)
    const targetVisible = lastActiveIndex >= 0 ? lastActiveIndex + 2 : 1;
    
    if (visibleSteps < targetVisible && visibleSteps < steps.length) {
      const timer = setTimeout(() => {
        setVisibleSteps(visibleSteps + 1);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [steps, visibleSteps]);

  // Auto-expand steps when they receive tool calls
  useEffect(() => {
    steps.forEach((step, index) => {
      if (step.toolCalls && step.toolCalls.length > 0) {
        setExpandedSteps((prev) => {
          if (!prev.has(index)) {
            const next = new Set(prev);
            next.add(index);
            return next;
          }
          return prev;
        });
      }
    });
  }, [steps]);

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleApproval = async (index: number, approved: boolean) => {
    const step = steps[index];
    if (!step.webhookUrl) return;

    setApprovingStep(index);

    try {
      await fetch(step.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved,
          reason: approved ? "Approved by reviewer" : "Rejected by reviewer",
        }),
      });
    } catch (error) {
      console.error("Error sending approval:", error);
      alert("Failed to send approval. Please try again.");
    } finally {
      setApprovingStep(null);
    }
  };

  return (
    <div className="relative">
      {/* Workflow Steps */}
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isVisible = index < visibleSteps;
          
          if (!isVisible) return null;

          return (
          <div
            key={index}
              className="transform transition-all duration-500 opacity-0 translate-y-4 animate-fadeIn"
              style={{ 
                animationDelay: `${(index - (visibleSteps - 5 > 0 ? visibleSteps - 5 : 0)) * 50}ms`,
                animationFillMode: 'forwards'
              }}
            >
              <div className="flex items-start gap-6">
                {/* Step Number & Icon */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 border flex items-center justify-center transition-all duration-300 ${
              step.status === "completed"
                        ? "border-white bg-white"
                : step.status === "running"
                          ? "border-zinc-500 bg-zinc-900 animate-pulse"
                  : step.status === "waiting"
                            ? "border-zinc-500 bg-zinc-900 animate-pulse"
                  : step.status === "error"
                            ? "border-zinc-700 bg-zinc-800"
                            : "border-zinc-800 bg-black"
            }`}
          >
              {step.status === "completed" ? (
                <svg
                        className="w-5 h-5 text-black"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                >
                  <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : step.status === "running" ? (
                      <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                    ) : step.status === "waiting" ? (
                      <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                    ) : step.status === "error" ? (
                <svg
                        className="w-4 h-4 text-zinc-500"
                  fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                      <span className="text-xs text-zinc-700 font-mono">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-px h-12 mt-2 transition-all duration-500 ${
                        step.status === "completed"
                          ? "bg-zinc-700"
                          : "bg-zinc-900"
                      }`}
                    />
              )}
            </div>

                {/* Step Content */}
                <div className="flex-1 pt-2">
                  <div className="flex items-baseline justify-between mb-2">
                    <h3
                      className={`text-base font-light tracking-wide transition-colors ${
                    step.status === "completed"
                          ? "text-white"
                      : step.status === "running"
                            ? "text-zinc-300"
                        : step.status === "waiting"
                              ? "text-zinc-300"
                        : step.status === "error"
                              ? "text-zinc-500"
                              : "text-zinc-700"
                  }`}
                >
                  {step.name}
                    </h3>
                {step.toolCalls && step.toolCalls.length > 0 && (
                  <button
                    onClick={() => toggleStep(index)}
                        className="ml-4 text-xs text-zinc-600 hover:text-zinc-400 flex items-center gap-1 font-mono transition-colors"
                  >
                        {step.toolCalls.length} tool{step.toolCalls.length !== 1 ? "s" : ""}
                    <svg
                      className={`w-3 h-3 transition-transform ${
                        expandedSteps.has(index) ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                          strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {step.message && (
                <p
                      className={`text-xs font-mono mt-1 ${
                        step.status === "error"
                          ? "text-zinc-600"
                          : "text-zinc-700"
                  }`}
                >
                  {step.message}
                </p>
              )}

                  {/* Approval Buttons */}
                  {step.status === "waiting" && step.webhookUrl && (
                    <div className="mt-4 p-4 border border-zinc-800 bg-zinc-950/30 rounded animate-fadeIn">
                      {step.approvalData && (
                        <div className="mb-4 text-xs text-zinc-400">
                          <p className="mb-1">
                            <span className="text-zinc-500">Score:</span>{" "}
                            <span className="text-white font-medium">
                              {step.approvalData.score}/100
                            </span>
                          </p>
                          {step.approvalData.snippets?.headline && (
                            <p className="text-zinc-400 italic">
                              "{step.approvalData.snippets.headline}"
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApproval(index, true)}
                          disabled={approvingStep === index}
                          className="flex-1 px-4 py-2 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {approvingStep === index ? "Approving..." : "Approve"}
                        </button>
                        <button
                          onClick={() => handleApproval(index, false)}
                          disabled={approvingStep === index}
                          className="flex-1 px-4 py-2 bg-zinc-900 text-white border border-zinc-700 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {approvingStep === index ? "Rejecting..." : "Reject"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tool Calls */}
          {step.toolCalls && step.toolCalls.length > 0 && expandedSteps.has(index) && (
                    <div className="mt-4 pl-4 border-l border-zinc-900 space-y-2 animate-fadeIn">
                  {step.toolCalls.map((tool, toolIndex) => (
                        <div key={toolIndex} className="text-xs">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-zinc-700 font-mono">
                              {String(toolIndex + 1).padStart(2, "0")}
                      </span>
                            <code className="font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 border border-zinc-900">
                            {tool.name}
                          </code>
                        </div>
                          <p className="text-zinc-700 font-light ml-6">
                          {tool.description}
                        </p>
                      </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

