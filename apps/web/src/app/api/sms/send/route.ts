import { NextResponse } from "next/server";
import { sendToPhones } from "@/lib/messages";
import type { SmsKind } from "@sms-kit/core";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as {
    phones?: unknown;
    body?: unknown;
    kind?: unknown;
  } | null;

  const phones = Array.isArray(payload?.phones)
    ? payload.phones.filter((phone): phone is string => typeof phone === "string")
    : typeof payload?.phones === "string"
      ? [payload.phones]
      : [];
  const body = typeof payload?.body === "string" ? payload.body : "";
  const kind: SmsKind = payload?.kind === "announcement" ? "announcement" : "message";

  if (phones.length === 0) {
    return NextResponse.json(
      { error: "Add at least one phone number." },
      { status: 400 },
    );
  }

  const result = await sendToPhones({ phones, body, kind });
  if (result.messages.length === 0) {
    return NextResponse.json(
      {
        error: "No valid Ethiopian mobile numbers were found.",
        invalid: result.invalid,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
