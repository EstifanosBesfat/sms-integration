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

type GeezSmsOptions = {
  token: string;
  shortcodeId?: string;
  baseUrl?: string;
};

export class GeezSmsProvider implements SmsProvider {
  readonly name = "geezsms" as const;
  private readonly baseUrl: string;

  constructor(private readonly options: GeezSmsOptions) {
    if (!options.token) {
      throw new SmsError("GEEZSMS_TOKEN is required for the GeezSMS provider");
    }
    this.baseUrl = (options.baseUrl ?? "https://api.geezsms.com").replace(/\/$/, "");
  }

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const body = new URLSearchParams();
    body.set("token", this.options.token);
    body.set("phone", input.to.replace("+", ""));
    body.set("msg", input.body);
    if (this.options.shortcodeId) {
      body.set("shortcode_id", this.options.shortcodeId);
    }
    if (input.callbackUrl) {
      body.set("callback", input.callbackUrl);
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1/sms/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
    } catch (error) {
      throw new SmsError("Could not reach GeezSMS", error);
    }

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const status = String(data.message_status ?? data.status ?? "").toLowerCase();
    if (!response.ok || (status && status !== "success")) {
      throw new SmsError(
        `GeezSMS rejected the send (${response.status}): ${JSON.stringify(data)}`,
      );
    }

    const providerMessageId = String(
      data.api_log_id ?? data.log ?? `geez_${Date.now()}_${input.to.replace(/\D/g, "")}`,
    );

    return {
      provider: this.name,
      providerMessageId,
    };
  }

  parseStatusWebhook(req: WebhookRequest): DeliveryEvent | null {
    const record = asRecord(req.body);
    const providerMessageId =
      stringField(record, ["api_log_id", "log", "id"]) ??
      firstQueryValue(req.query, ["api_log_id", "log", "id"]);
    const status =
      mapDeliveryStatus(stringField(record, ["message_status", "status"])) ??
      mapDeliveryStatus(firstQueryValue(req.query, ["message_status", "status"])) ??
      "sent";

    if (!providerMessageId) {
      return null;
    }

    return {
      providerMessageId,
      phone: stringField(record, ["phone", "to"]) ?? firstQueryValue(req.query, ["phone", "to"]),
      status,
      error: stringField(record, ["error"]),
      raw: Object.keys(record).length > 0 ? req.body : req.query,
    };
  }

  parseInboundWebhook(req: WebhookRequest): InboundMessage | null {
    const record = asRecord(req.body);
    const from =
      stringField(record, ["phone", "from", "sender"]) ??
      firstQueryValue(req.query, ["phone", "from", "sender"]);
    const body =
      stringField(record, ["message", "msg", "text", "body"]) ??
      firstQueryValue(req.query, ["message", "msg", "text", "body"]);

    if (!from || body === undefined) {
      return null;
    }

    return {
      from,
      body,
      to: stringField(record, ["shortcode", "to"]),
      providerMessageId: stringField(record, ["api_log_id", "id"]),
      raw: Object.keys(record).length > 0 ? req.body : req.query,
    };
  }
}
