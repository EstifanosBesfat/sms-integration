import { NextResponse } from "next/server";
import { getSmsProvider } from "@/lib/sms";

export async function GET() {
  return NextResponse.json({
    provider: getSmsProvider().name,
  });
}
