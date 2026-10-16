import {
  PhoneError,
  normalizeEthiopianMobile,
  parsePhoneList,
  type SmsKind,
  type SmsStatus,
} from "@sms-kit/core";
import { prisma } from "./prisma";
import { getCallbackUrl, getSmsProvider } from "./sms";

export type PublicMessage = {
  id: string;
  direction: "outbound" | "inbound";
  kind: SmsKind;
  phone: string;
  body: string;
  status: SmsStatus;
  provider: string;
  providerMessageId: string | null;
  error: string | null;
  createdAt: string;
};

function toPublic(message: {
  id: string;
  direction: string;
  kind: string;
  phone: string;
  body: string;
  status: string;
  provider: string;
  providerMessageId: string | null;
  error: string | null;
  createdAt: Date;
}): PublicMessage {
  return {
    id: message.id,
    direction: message.direction as PublicMessage["direction"],
    kind: message.kind as SmsKind,
    phone: message.phone,
    body: message.body,
    status: message.status as SmsStatus,
    provider: message.provider,
    providerMessageId: message.providerMessageId,
    error: message.error,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function listMessages(): Promise<PublicMessage[]> {
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return messages.map(toPublic);
}

export async function sendToPhones(input: {
  phones: string[];
  body: string;
  kind: SmsKind;
}): Promise<{ messages: PublicMessage[]; invalid: string[] }> {
  const body = input.body.trim();
  if (!body) {
    throw new Error("Message body is required");
  }

  const parsed = parsePhoneList(input.phones.join("\n"));
  if (parsed.valid.length === 0) {
    return { messages: [], invalid: parsed.invalid };
  }

  const provider = getSmsProvider();
  const callbackUrl = getCallbackUrl("/api/webhooks/sms/status");
  const created: PublicMessage[] = [];

  for (const phone of parsed.valid) {
    const queued = await prisma.message.create({
      data: {
        direction: "outbound",
        kind: input.kind,
        phone,
        body,
        status: "queued",
        provider: provider.name,
      },
    });

    try {
      const result = await provider.send({
        to: phone,
        body,
        callbackUrl,
      });

      const updated = await prisma.message.update({
        where: { id: queued.id },
        data: {
          status: "sent",
          provider: result.provider,
          providerMessageId: result.providerMessageId,
        },
      });
      created.push(toPublic(updated));
    } catch (error) {
      const updated = await prisma.message.update({
        where: { id: queued.id },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : "Send failed",
        },
      });
      created.push(toPublic(updated));
    }
  }

  return { messages: created, invalid: parsed.invalid };
}

export async function applyDeliveryEvent(event: {
  providerMessageId: string;
  phone?: string;
  status: Extract<SmsStatus, "sent" | "delivered" | "failed">;
  error?: string;
}): Promise<PublicMessage | null> {
  const existing = await prisma.message.findFirst({
    where: event.phone
      ? {
          OR: [
            { providerMessageId: event.providerMessageId },
            { phone: event.phone, direction: "outbound" },
          ],
        }
      : { providerMessageId: event.providerMessageId },
    orderBy: { createdAt: "desc" },
  });

  if (!existing) {
    return null;
  }

  const updated = await prisma.message.update({
    where: { id: existing.id },
    data: {
      status: event.status,
      error: event.error ?? null,
      providerMessageId: event.providerMessageId,
    },
  });

  return toPublic(updated);
}

export async function recordInbound(input: {
  from: string;
  body: string;
  providerMessageId?: string;
}): Promise<PublicMessage> {
  let phone = input.from;
  try {
    phone = normalizeEthiopianMobile(input.from);
  } catch (error) {
    if (!(error instanceof PhoneError)) {
      throw error;
    }
  }

  const saved = await prisma.message.create({
    data: {
      direction: "inbound",
      kind: "message",
      phone,
      body: input.body,
      status: "delivered",
      provider: getSmsProvider().name,
      providerMessageId: input.providerMessageId,
    },
  });

  return toPublic(saved);
}
