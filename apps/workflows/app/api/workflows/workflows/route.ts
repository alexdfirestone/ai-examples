import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { reviewCandidateProfile } from "@/workflows/resume-example";
import type { CandidateInput } from "@/workflows/resume-example/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workflow, input } = body;

    // Route to the correct workflow based on the workflow parameter
    if (workflow === "resume-review") {
      const candidateInput = input as CandidateInput;

      // Validate required fields
      if (!candidateInput.candidateId) {
        return NextResponse.json(
          { error: "candidateId is required" },
          { status: 400 }
        );
      }

      // Start the workflow and get the run
      console.log(`[api] Starting workflow for ${candidateInput.candidateId}`);
      const run = await start(reviewCandidateProfile, [candidateInput]);

      // Get the readable stream from the workflow
      const stream = run.readable;

      // Return the stream to the client
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    return NextResponse.json(
      { error: "Unknown workflow type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[api] Error starting workflow:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

