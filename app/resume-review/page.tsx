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
  status: "pending" | "running" | "completed" | "error";
  message?: string;
  toolCalls?: Array<{
    name: string;
    description: string;
    timestamp: number;
  }>;
}

export default function ResumeReviewPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState("resume-review");
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { name: "Validate Input", status: "pending" },
    { name: "Ingest Sources", status: "pending" },
    { name: "Extract & Normalize Text", status: "pending" },
    { name: "AI Profile Enrichment", status: "pending" },
    { name: "Generate Snippets", status: "pending" },
    { name: "Human Approval", status: "pending" },
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
    persist: 5,
    notify: 6,
  };

  const handleSubmit = async (input: CandidateInput) => {
    setIsLoading(true);
    setResult(null);

    // Reset steps
    setSteps([
      { name: "Validate Input", status: "pending" },
      { name: "Ingest Sources", status: "pending" },
      { name: "Extract & Normalize Text", status: "pending" },
      { name: "AI Profile Enrichment", status: "pending" },
      { name: "Generate Snippets", status: "pending" },
      { name: "Persist Profile", status: "pending" },
      { name: "Notify Teams", status: "pending" },
    ]);

    try {
      // Make API call with streaming
      const response = await fetch("/api/resume-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
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
    setSteps([
      { name: "Validate Input", status: "pending" },
      { name: "Ingest Sources", status: "pending" },
      { name: "Extract & Normalize Text", status: "pending" },
      { name: "AI Profile Enrichment", status: "pending" },
      { name: "Generate Snippets", status: "pending" },
      { name: "Persist Profile", status: "pending" },
      { name: "Notify Teams", status: "pending" },
    ]);
  };

  const workflows = [
    {
      id: "resume-review",
      name: "Resume Review",
      description: "AI-powered candidate evaluation",
    },
  ];

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left Sidebar */}
      <div className="w-96 bg-zinc-950 border-r border-zinc-800 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-light text-white tracking-wide">
            WORKFLOW AUTOMATION
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-light">
            Real-time process orchestration
          </p>
        </div>

        {/* Workflow Selector */}
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Select Workflow
          </h2>
          <div className="space-y-2">
            {workflows.map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => setSelectedWorkflow(workflow.id)}
                disabled={isLoading}
                className={`w-full text-left p-4 rounded-sm border transition-all ${
                  selectedWorkflow === workflow.id
                    ? "bg-white text-black border-white"
                    : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="font-medium text-sm">{workflow.name}</div>
                <div className="text-xs mt-1 opacity-70">
                  {workflow.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          <UploadForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-12 overflow-y-auto">
        {isLoading || result ? (
          <div className="w-full max-w-4xl">
            <WorkflowProgress steps={steps} />

            {result && (
              <div className="mt-12">
                <ProfileResults result={result} />

                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleReset}
                    className="px-8 py-3 text-sm font-light text-white bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 transition-colors tracking-wide"
                  >
                    REVIEW ANOTHER CANDIDATE
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}

