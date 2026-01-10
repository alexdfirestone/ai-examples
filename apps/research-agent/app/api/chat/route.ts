import { start } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";
import { researchWorkflow } from "@/workflows/research/workflow";

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Start the durable workflow
  const run = await start(researchWorkflow, [messages]);

  // Return the readable stream with the run ID in headers
  return createUIMessageStreamResponse({
    stream: run.readable,
    headers: {
      "x-workflow-run-id": run.runId,
    },
  });
}
