import { NextResponse } from "next/server";
import { applyDeliveryEvent, recordInbound } from "@/lib/messages";
import { getSmsProvider } from "@/lib/sms";

export async function POST(request: Request) {
  if (getSmsProvider().name !== "mock") {
    return NextResponse.json(
      { error: "Simulation is only available in mock mode." },
      { status: 403 },
    );
  }

  const payload = (await request.json().catch(() => null)) as {
    action?: unknown;
    providerMessageId?: unknown;
    phone?: unknown;
    body?: unknown;
    status?: unknown;
  } | null;

  const action = payload?.action;
  if (action === "status") {
    const providerMessageId =
      typeof payload?.providerMessageId === "string" ? payload.providerMessageId : "";
    const status = payload?.status;
    if (
      !providerMessageId ||
      (status !== "delivered" && status !== "failed" && status !== "sent")
    ) {
      return NextResponse.json({ error: "Need providerMessageId and a status." }, { status: 400 });
    }

    const message = await applyDeliveryEvent({
      providerMessageId,
      phone: typeof payload?.phone === "string" ? payload.phone : undefined,
      status,
      error: status === "failed" ? "Simulated failure" : undefined,
    });
    return NextResponse.json({ message });
  }

  if (action === "inbound") {
    const phone = typeof payload?.phone === "string" ? payload.phone : "";
    const body = typeof payload?.body === "string" ? payload.body : "";
    if (!phone || !body) {
      return NextResponse.json({ error: "Need a phone and reply body." }, { status: 400 });
    }
    const message = await recordInbound({ from: phone, body });
    return NextResponse.json({ message });
  }

  return NextResponse.json({ error: "Unknown simulation action." }, { status: 400 });
}
