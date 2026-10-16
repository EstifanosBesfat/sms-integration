import type { SmsKind, SmsProviderName, SmsStatus } from "@sms-kit/core";

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

export type ProviderName = SmsProviderName;
