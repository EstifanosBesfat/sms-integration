import { NextResponse } from "next/server";
import { getSmsProvider } from "@/lib/sms";
import { listMessages } from "@/lib/messages";

export async function GET() {
  const messages = await listMessages();
  const provider = getSmsProvider();

  return NextResponse.json({
    provider: provider.name,
    messages,
  });
}
