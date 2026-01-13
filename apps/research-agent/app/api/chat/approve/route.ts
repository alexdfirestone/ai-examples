import { outlineApprovalHook } from "@/workflows/research/tools";

export async function POST(req: Request) {
  const { toolCallId, approved } = await req.json();

  if (!toolCallId) {
    return Response.json({ error: "Missing toolCallId" }, { status: 400 });
  }

  // Resume the hook to continue the workflow
  // Schema validation happens automatically via the defineHook schema
  await outlineApprovalHook.resume(toolCallId, { approved });

  return Response.json({ success: true });
}
