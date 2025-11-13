"use client";

import { useState } from "react";
import { UploadForm } from "./components/upload-form";
import { WorkflowProgress } from "./components/workflow-progress";
import { ProfileResults } from "./components/profile-results";
import type {
  CandidateInput,
  WorkflowResult,
} from "@/workflows/resume-example/types";

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

export default function WorkflowsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState("resume-review");
  const [activeTab, setActiveTab] = useState<"execution" | "results">("execution");
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { name: "Validate Input", status: "pending" },
    { name: "Ingest Sources", status: "pending" },
    { name: "Extract & Normalize Text", status: "pending" },
    { name: "AI Profile Enrichment", status: "pending" },
    { name: "Generate Snippets", status: "pending" },
    { name: "Human Approval", status: "pending" as const },
    { name: "Persist Profile", status: "pending" },
    { name: "Notify Teams", status: "pending" },
  ]);

  const updateStepStatus = (
    index: number,
    status: WorkflowStep["status"],
    message?: string
  ) => {
    setSteps((prev) =>
      prev.map((step, i) =>
        i === index ? { ...step, status, message } : step
      )
    );
  };

  const stepNameMap: Record<string, number> = {
    validate: 0,
    ingest: 1,
    extract: 2,
    "agent-enrich": 3,
    "generate-snippets": 4,
    "human-approval": 5,
    persist: 6,
    notify: 7,
  };

  const handleSubmit = async (input: CandidateInput) => {
    setIsLoading(true);
    setResult(null);
    setActiveTab("execution");

    // Reset steps
    setSteps([
      { name: "Validate Input", status: "pending" },
      { name: "Ingest Sources", status: "pending" },
      { name: "Extract & Normalize Text", status: "pending" },
      { name: "AI Profile Enrichment", status: "pending" },
      { name: "Generate Snippets", status: "pending" },
      { name: "Human Approval", status: "pending" },
      { name: "Persist Profile", status: "pending" },
      { name: "Notify Teams", status: "pending" },
    ]);

    try {
      // Make API call with streaming
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: selectedWorkflow, input }),
      });

      if (!response.ok) {
        throw new Error("Failed to start workflow");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const update = JSON.parse(line);
            const { step, status, data } = update;

            console.log("[stream update]", update);

            // Update step status
            if (step !== "workflow" && stepNameMap[step] !== undefined) {
              const stepIndex = stepNameMap[step];

              if (status === "running") {
                updateStepStatus(stepIndex, "running");
              } else if (status === "waiting") {
                // Handle waiting state (for human approval)
                setSteps((prev) =>
                  prev.map((s, i) =>
                    i === stepIndex
                      ? {
                          ...s,
                          status: "waiting",
                          webhookUrl: data?.webhookUrl,
                          approvalData: data
                            ? {
                                candidateId: data.candidateId,
                                snippets: data.snippets,
                                score: data.score,
                              }
                            : undefined,
                        }
                      : s
                  )
                );
              } else if (status === "tool-call") {
                // Update tool calls for this step
                setSteps((prev) =>
                  prev.map((s, i) =>
                    i === stepIndex
                      ? { ...s, toolCalls: data?.toolCalls || [] }
                      : s
                  )
                );
              } else if (status === "completed") {
                // Build message from data if available
                let message = "";
                if (data) {
                  if (data.tokens !== undefined) {
                    message = `Processed ${data.tokens} tokens`;
                  } else if (data.score !== undefined) {
                    message = `Score: ${data.score}/100`;
                  } else if (data.approved !== undefined) {
                    message = data.approved ? "Approved" : "Rejected";
                  }
                }
                updateStepStatus(stepIndex, "completed", message);
              }
            }

            // Handle workflow completion
            if (step === "workflow" && status === "completed" && data) {
              setResult(data as WorkflowResult);
              // Auto-switch to results tab
              setTimeout(() => setActiveTab("results"), 500);
              // Break out of the loop - workflow is done
              reader.cancel();
              break;
            }

            // Handle workflow error
            if (step === "workflow" && status === "error") {
              reader.cancel();
              throw new Error(data?.message || "Workflow failed");
            }
          } catch (parseError) {
            console.error("Error parsing stream update:", parseError, line);
          }
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);

      // Mark current running step as error
      setSteps((prev) =>
        prev.map((step) =>
          step.status === "running"
            ? {
                ...step,
                status: "error" as const,
                message:
                  error instanceof Error
                    ? error.message
                    : "An error occurred",
              }
            : step
        )
      );

      setResult({
        status: "failed",
        candidateId: input.candidateId,
        approved: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setActiveTab("execution");
    setSteps([
      { name: "Validate Input", status: "pending" },
      { name: "Ingest Sources", status: "pending" },
      { name: "Extract & Normalize Text", status: "pending" },
      { name: "AI Profile Enrichment", status: "pending" },
      { name: "Generate Snippets", status: "pending" },
      { name: "Human Approval", status: "pending" },
      { name: "Persist Profile", status: "pending" },
      { name: "Notify Teams", status: "pending" },
    ]);
  };

  const workflows = [
    {
      id: "resume-review",
      name: "Resume Review",
      description: "Demo 1",
    },
  ];

  return (
    <div className="h-screen bg-black flex overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-96 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex-shrink-0">
          <h1 className="text-xl font-light text-white tracking-wide">
            WORKFLOW AUTOMATION
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-light">
            Real-time process orchestration
          </p>
        </div>

        {/* Workflow Selector */}
        <div className="p-5 border-b border-zinc-800 flex-shrink-0">
          <label htmlFor="workflow-select" className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Select Workflow
          </label>
          <div className="relative">
            <select
              id="workflow-select"
              value={selectedWorkflow}
              onChange={(e) => setSelectedWorkflow(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-light focus:outline-none focus:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer"
            >
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name} - {workflow.description}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Form - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <UploadForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {isLoading || result ? (
          <>
            {/* Tab Navigation - Fixed at top */}
            <div className="flex-shrink-0 flex items-center justify-between px-12 py-8 border-b border-zinc-900">
              <div className="flex-1" />
              <div className="flex items-center gap-8">
                <button
                  onClick={() => setActiveTab("execution")}
                  className={`text-sm font-light uppercase tracking-widest pb-2 border-b-2 transition-all flex items-baseline gap-3 cursor-pointer ${
                    activeTab === "execution"
                      ? "text-white border-white"
                      : "text-zinc-600 border-transparent hover:text-zinc-400"
                  }`}
                >
                  <span>Workflow Execution</span>
                  <span className="text-xs font-mono">
                    {steps.filter((s) => s.status === "completed").length}/{steps.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("results")}
                  disabled={!result}
                  className={`text-sm font-light uppercase tracking-widest pb-2 border-b-2 transition-all ${
                    activeTab === "results"
                      ? "text-white border-white cursor-pointer"
                      : result
                        ? "text-zinc-600 border-transparent hover:text-zinc-400 cursor-pointer"
                        : "text-zinc-800 border-transparent cursor-not-allowed"
                  }`}
                >
                  Results
                </button>
              </div>
              <div className="flex-1 flex justify-end">
                {result && (
                  <button
                    onClick={handleReset}
                    title="Reset workflow"
                    className="p-2 text-zinc-600 hover:text-white border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Tab Content */}
            <div className="flex-1 overflow-y-auto px-12 py-8">
              <div className="w-full max-w-4xl mx-auto">
                {activeTab === "execution" && (
                  <div className="animate-fadeIn">
                    <WorkflowProgress steps={steps} />
                  </div>
                )}

                {activeTab === "results" && result && (
                  <div className="animate-fadeIn">
                    <ProfileResults result={result} />
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border border-zinc-800 rounded-sm flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-zinc-700"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-light text-zinc-400 tracking-wide">
                NO ACTIVE WORKFLOW
              </h3>
              <p className="text-xs text-zinc-600 mt-2">
                Configure and initiate a workflow from the sidebar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

