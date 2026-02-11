import { start } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";
import { chatWorkflow } from "@/workflows/chat/workflow";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const run = await start(chatWorkflow, [messages]);

  return createUIMessageStreamResponse({
    stream: run.readable,
    headers: {
      "x-workflow-run-id": run.runId,
    },
  });
}
