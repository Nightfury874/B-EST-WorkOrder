import { NextResponse } from "next/server";
import { listSystemLogs } from "@/lib/systemLog";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? "200");
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 200;
  const logs = await listSystemLogs(limit);
  return NextResponse.json({ logs });
}
