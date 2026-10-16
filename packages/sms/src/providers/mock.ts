import type {
  DeliveryEvent,
  InboundMessage,
  SendSmsInput,
  SendSmsResult,
  SmsProvider,
  WebhookRequest,
} from "../types";
import { asRecord, firstQueryValue, mapDeliveryStatus, stringField } from "../webhook";

export class MockSmsProvider implements SmsProvider {
  readonly name = "mock" as const;

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    if (!input.to || !input.body.trim()) {
      throw new Error("Mock send requires a phone number and message body");
    }

    return {
      provider: this.name,
      providerMessageId: `mock_${crypto.randomUUID()}`,
    };
  }

  parseStatusWebhook(req: WebhookRequest): DeliveryEvent | null {
    const record = asRecord(req.body);
    const providerMessageId =
      stringField(record, ["providerMessageId", "messageId", "id"]) ??
      firstQueryValue(req.query, ["providerMessageId", "messageId", "id"]);
    const status =
      mapDeliveryStatus(stringField(record, ["status"])) ??
      mapDeliveryStatus(firstQueryValue(req.query, ["status"]));

    if (!providerMessageId || !status) {
      return null;
    }

    return {
      providerMessageId,
      phone: stringField(record, ["phone", "to"]) ?? firstQueryValue(req.query, ["phone", "to"]),
      status,
      error: stringField(record, ["error"]),
      raw: req.body ?? req.query,
    };
  }

  parseInboundWebhook(req: WebhookRequest): InboundMessage | null {
    const record = asRecord(req.body);
    const from =
      stringField(record, ["from", "phone"]) ??
      firstQueryValue(req.query, ["from", "phone"]);
    const body =
      stringField(record, ["body", "message", "text"]) ??
      firstQueryValue(req.query, ["body", "message", "text"]);

    if (!from || body === undefined) {
      return null;
    }

    return {
      from,
      body,
      to: stringField(record, ["to"]),
      providerMessageId: stringField(record, ["providerMessageId", "id"]),
      raw: req.body ?? req.query,
    };
  }
}
