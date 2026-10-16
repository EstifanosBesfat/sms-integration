import { createSmsProvider, type SmsProvider } from "@sms-kit/core";

const globalForSms = globalThis as unknown as {
  smsProvider?: SmsProvider;
};

export function getSmsProvider(): SmsProvider {
  if (!globalForSms.smsProvider) {
    globalForSms.smsProvider = createSmsProvider();
  }
  return globalForSms.smsProvider;
}

export function getCallbackUrl(path: string): string | undefined {
  const base = process.env.SMS_CALLBACK_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    return undefined;
  }
  return `${base}${path}`;
}
