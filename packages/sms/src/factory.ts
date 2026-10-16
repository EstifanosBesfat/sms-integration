import { AfroMessageProvider } from "./providers/afro-message";
import { GeezSmsProvider } from "./providers/geez-sms";
import { MockSmsProvider } from "./providers/mock";
import { SmsError, type SmsProvider, type SmsProviderConfig, type SmsProviderName } from "./types";

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function resolveName(config: SmsProviderConfig = {}): SmsProviderName {
  const requested = (config.provider ?? readEnv("SMS_PROVIDER") ?? "").toLowerCase();

  if (requested === "afromessage" || requested === "mock" || requested === "geezsms") {
    if (requested === "afromessage" && !config.afroMessage?.token && !readEnv("AFROMESSAGE_TOKEN")) {
      return "mock";
    }
    if (requested === "geezsms" && !config.geezSms?.token && !readEnv("GEEZSMS_TOKEN")) {
      return "mock";
    }
    return requested;
  }

  if (config.afroMessage?.token || readEnv("AFROMESSAGE_TOKEN")) {
    return "afromessage";
  }

  return "mock";
}

export function createSmsProvider(config: SmsProviderConfig = {}): SmsProvider {
  const name = resolveName(config);

  if (name === "mock") {
    return new MockSmsProvider();
  }

  if (name === "afromessage") {
    return new AfroMessageProvider({
      token: config.afroMessage?.token ?? readEnv("AFROMESSAGE_TOKEN") ?? "",
      identifierId: config.afroMessage?.identifierId ?? readEnv("AFROMESSAGE_IDENTIFIER_ID"),
      senderName: config.afroMessage?.senderName ?? readEnv("AFROMESSAGE_SENDER_NAME"),
      baseUrl: config.afroMessage?.baseUrl ?? readEnv("AFROMESSAGE_BASE_URL"),
    });
  }

  if (name === "geezsms") {
    return new GeezSmsProvider({
      token: config.geezSms?.token ?? readEnv("GEEZSMS_TOKEN") ?? "",
      shortcodeId: config.geezSms?.shortcodeId ?? readEnv("GEEZSMS_SHORTCODE_ID"),
      baseUrl: config.geezSms?.baseUrl ?? readEnv("GEEZSMS_BASE_URL"),
    });
  }

  throw new SmsError(`Unknown SMS provider: ${String(name)}`);
}
