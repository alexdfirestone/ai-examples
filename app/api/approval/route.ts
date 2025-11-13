import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { webhookUrl, approved, reason } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "webhookUrl is required" },
        { status: 400 }
      );
    }

    console.log(`[approval] Forwarding approval to webhook: ${webhookUrl}`);
    console.log(`[approval] Approved: ${approved}, Reason: ${reason}`);

    // Forward the approval to the webhook (server-to-server)
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        approved, 
        reason 
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[approval] Webhook error: ${response.status} ${errorText}`);
      throw new Error(`Webhook request failed: ${response.statusText}`);
    }

    console.log(`[approval] Successfully sent approval to webhook`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[approval] Error forwarding approval:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

