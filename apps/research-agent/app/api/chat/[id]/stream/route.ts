import { getRun } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const run = getRun(id);

  // Get startIndex from query params for resumption
  const startIndex = new URL(req.url).searchParams.get("startIndex");

  return createUIMessageStreamResponse({
    stream: run.getReadable({
      startIndex: startIndex ? parseInt(startIndex) : undefined,
    }),
  });
}
