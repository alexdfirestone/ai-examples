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
}

export default function ResumeReviewPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
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
            }

            // Handle workflow error
            if (step === "workflow" && status === "error") {
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Resume Review Workflow
          </h1>
          <p className="text-gray-600">
            AI-powered candidate review with real-time progress tracking
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Form */}
          <div>
            <UploadForm onSubmit={handleSubmit} isLoading={isLoading} />
          </div>

          {/* Right Column: Progress & Results */}
          <div className="space-y-6">
            {isLoading || result ? (
              <>
                <WorkflowProgress steps={steps} />

                {result && (
                  <>
                    <ProfileResults result={result} />

                    <button
                      onClick={handleReset}
                      className="w-full px-6 py-3 text-base font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 border border-blue-200 transition-colors"
                    >
                      Review Another Candidate
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <svg
                  className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Review Yet
                </h3>
                <p className="text-sm text-gray-600">
                  Fill out the form and click &quot;Start Review&quot; to begin
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h3 className="font-medium mb-1">1. Data Ingestion</h3>
              <p className="text-blue-700">
                Collects resume, LinkedIn, and GitHub data (mocked for demo)
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">2. AI Enrichment</h3>
              <p className="text-blue-700">
                Uses OpenAI to extract structured profile information
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">3. Smart Scoring</h3>
              <p className="text-blue-700">
                Evaluates candidate against job requirements with scoring rubric
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">4. Workflow Automation</h3>
              <p className="text-blue-700">
                Powered by Vercel Workflows with built-in retry and monitoring
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

