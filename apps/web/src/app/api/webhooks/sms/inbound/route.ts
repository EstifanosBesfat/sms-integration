import { NextResponse } from "next/server";
import { recordInbound } from "@/lib/messages";
import { queryRecord } from "@/lib/query";
import { getSmsProvider } from "@/lib/sms";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const inbound = getSmsProvider().parseInboundWebhook({
    method: "POST",
    query: queryRecord(url),
    body,
  });

  if (!inbound) {
    return NextResponse.json({ ok: false, error: "Unrecognized inbound payload" }, { status: 400 });
  }

  const message = await recordInbound({
    from: inbound.from,
    body: inbound.body,
    providerMessageId: inbound.providerMessageId,
  });

  return NextResponse.json({ ok: true, message });
}
