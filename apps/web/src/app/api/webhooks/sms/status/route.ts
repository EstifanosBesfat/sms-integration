import { NextResponse } from "next/server";
import { applyDeliveryEvent } from "@/lib/messages";
import { queryRecord } from "@/lib/query";
import { getSmsProvider } from "@/lib/sms";

async function handle(request: Request) {
  const url = new URL(request.url);
  const body =
    request.method === "GET" ? {} : await request.json().catch(() => ({}));
  const event = getSmsProvider().parseStatusWebhook({
    method: request.method,
    query: queryRecord(url),
    body,
  });

  if (!event) {
    return NextResponse.json({ ok: false, error: "Unrecognized status payload" }, { status: 400 });
  }

  const message = await applyDeliveryEvent(event);
  return NextResponse.json({ ok: true, message });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
