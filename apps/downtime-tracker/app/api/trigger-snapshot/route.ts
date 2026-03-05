import { NextResponse } from "next/server";
import { runStatusCheck } from "@/lib/check-status";

export async function POST() {
  const result = await runStatusCheck();
  return NextResponse.json(result);
}
