import { start } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";
import { chatWorkflow } from "@/workflows/chat/workflow";

export async function POST(req: Request) {
  const { messages, mode, chatMode, changedSections, browseSections } =
    await req.json();

  const run = await start(chatWorkflow, [
    {
      messages,
      mode: mode || "engineer",
      chatMode: chatMode || "changes",
      changedSections,
      browseSections,
    },
  ]);

  return createUIMessageStreamResponse({
    stream: run.readable,
    headers: {
      "x-workflow-run-id": run.runId,
    },
  });
}
