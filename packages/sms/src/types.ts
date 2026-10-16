export type SmsStatus = "queued" | "sent" | "delivered" | "failed";
export type SmsKind = "message" | "announcement";
export type SmsDirection = "outbound" | "inbound";
export type SmsProviderName = "mock" | "afromessage" | "geezsms";

export type SendSmsInput = {
  to: string;
  body: string;
  callbackUrl?: string;
};

export type SendSmsResult = {
  provider: SmsProviderName;
  providerMessageId: string;
};

export type DeliveryEvent = {
  providerMessageId: string;
  phone?: string;
  status: Extract<SmsStatus, "sent" | "delivered" | "failed">;
  error?: string;
  raw?: unknown;
};

export type InboundMessage = {
  from: string;
  body: string;
  to?: string;
  providerMessageId?: string;
  raw?: unknown;
};

export type WebhookRequest = {
  method: string;
  query: Record<string, string | string[] | undefined>;
  body: unknown;
};

export interface SmsProvider {
  readonly name: SmsProviderName;
  send(input: SendSmsInput): Promise<SendSmsResult>;
  parseStatusWebhook(req: WebhookRequest): DeliveryEvent | null;
  parseInboundWebhook(req: WebhookRequest): InboundMessage | null;
}

export type SmsProviderConfig = {
  provider?: string;
  afroMessage?: {
    token: string;
    identifierId?: string;
    senderName?: string;
    baseUrl?: string;
  };
  geezSms?: {
    token: string;
    shortcodeId?: string;
    baseUrl?: string;
  };
};

export class SmsError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SmsError";
  }
}

export class PhoneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhoneError";
  }
}
