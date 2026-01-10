import { resumeWebhook } from "workflow/api";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 400 });
  }

  const body = await req.json();

  // Resume the webhook to continue the workflow
  await resumeWebhook(token, body);

  return Response.json({ success: true });
}
