import { SmsError } from "../types";
import type {
  DeliveryEvent,
  InboundMessage,
  SendSmsInput,
  SendSmsResult,
  SmsProvider,
  WebhookRequest,
} from "../types";
import { asRecord, firstQueryValue, mapDeliveryStatus, stringField } from "../webhook";

type AfroMessageOptions = {
  token: string;
  identifierId?: string;
  senderName?: string;
  baseUrl?: string;
};

type AfroSendResponse = {
  acknowledge?: string;
  response?: {
    code?: string | number;
    to?: string;
    message_id?: string;
    messageId?: string;
    id?: string;
    errors?: unknown;
  };
};

export class AfroMessageProvider implements SmsProvider {
  readonly name = "afromessage" as const;
  private readonly baseUrl: string;

  constructor(private readonly options: AfroMessageOptions) {
    if (!options.token) {
      throw new SmsError("AFROMESSAGE_TOKEN is required for the AfroMessage provider");
    }
    this.baseUrl = (options.baseUrl ?? "https://api.afromessage.com").replace(/\/$/, "");
  }

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const payload: Record<string, string> = {
      to: input.to,
      message: input.body,
    };

    if (this.options.identifierId) {
      payload.from = this.options.identifierId;
    }
    if (this.options.senderName) {
      payload.sender = this.options.senderName;
    }
    if (input.callbackUrl) {
      payload.callback = input.callbackUrl;
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new SmsError("Could not reach AfroMessage", error);
    }

    const data = (await response.json().catch(() => ({}))) as AfroSendResponse;
    if (!response.ok || data.acknowledge !== "success") {
      const listed = data.response?.errors;
      const firstError = Array.isArray(listed)
        ? listed.find((item): item is string => typeof item === "string")
        : undefined;
      throw new SmsError(
        firstError ??
          `AfroMessage rejected the send (${response.status}): ${JSON.stringify(data)}`,
      );
    }

    const providerMessageId =
      data.response?.message_id ??
      data.response?.messageId ??
      data.response?.id ??
      `afro_${Date.now()}_${input.to.replace(/\D/g, "")}`;

    return {
      provider: this.name,
      providerMessageId: String(providerMessageId),
    };
  }

  parseStatusWebhook(req: WebhookRequest): DeliveryEvent | null {
    const record = asRecord(req.body);
    const providerMessageId =
      stringField(record, ["message_id", "messageId", "id", "uuid"]) ??
      firstQueryValue(req.query, ["message_id", "messageId", "id", "uuid"]);
    const status =
      mapDeliveryStatus(stringField(record, ["status", "message_status", "state"])) ??
      mapDeliveryStatus(firstQueryValue(req.query, ["status", "message_status", "state"]));

    if (!providerMessageId || !status) {
      return null;
    }

    return {
      providerMessageId,
      phone:
        stringField(record, ["to", "phone", "recipient"]) ??
        firstQueryValue(req.query, ["to", "phone", "recipient"]),
      status,
      error:
        stringField(record, ["error", "error_message", "reason"]) ??
        firstQueryValue(req.query, ["error", "error_message", "reason"]),
      raw: Object.keys(record).length > 0 ? req.body : req.query,
    };
  }

  parseInboundWebhook(req: WebhookRequest): InboundMessage | null {
    const record = asRecord(req.body);
    const from =
      stringField(record, ["from", "sender", "phone", "msisdn"]) ??
      firstQueryValue(req.query, ["from", "sender", "phone", "msisdn"]);
    const body =
      stringField(record, ["message", "text", "body", "content"]) ??
      firstQueryValue(req.query, ["message", "text", "body", "content"]);

    if (!from || body === undefined) {
      return null;
    }

    return {
      from,
      body,
      to:
        stringField(record, ["to", "shortcode"]) ??
        firstQueryValue(req.query, ["to", "shortcode"]),
      providerMessageId:
        stringField(record, ["message_id", "id"]) ??
        firstQueryValue(req.query, ["message_id", "id"]),
      raw: Object.keys(record).length > 0 ? req.body : req.query,
    };
  }
}
