import { NextResponse } from "next/server";
import { resumeHook } from "workflow/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { webhookToken, approved, reason } = body;

    if (!webhookToken) {
      return NextResponse.json(
        { error: "webhookToken is required" },
        { status: 400 }
      );
    }

    console.log(`[approval] Resuming workflow with token: ${webhookToken}`);
    console.log(`[approval] Approved: ${approved}, Reason: ${reason}`);

    // Resume the workflow using the token
    const result = await resumeHook(webhookToken, { 
      approved, 
      reason 
    });

    console.log(`[approval] Successfully resumed workflow, runId: ${result.runId}`);
    return NextResponse.json({ success: true, runId: result.runId });
  } catch (error) {
    console.error("[approval] Error resuming workflow:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

