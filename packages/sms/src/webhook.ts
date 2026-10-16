export function firstQueryValue(
  query: Record<string, string | string[] | undefined>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = query[key];
    if (Array.isArray(value) && value[0]) {
      return value[0];
    }
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

export function asRecord(body: unknown): Record<string, unknown> {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

export function stringField(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
    if (typeof value === "number") {
      return String(value);
    }
  }
  return undefined;
}

export function mapDeliveryStatus(
  value: string | undefined,
): "sent" | "delivered" | "failed" | null {
  if (!value) {
    return null;
  }

  const status = value.toLowerCase();
  if (
    ["delivered", "delivery", "success", "ok", "2", "delivrd"].includes(status)
  ) {
    return "delivered";
  }
  if (["sent", "queued", "accepted", "submitted", "1"].includes(status)) {
    return "sent";
  }
  if (
    ["failed", "fail", "error", "undelivered", "rejected", "expired", "0"].includes(
      status,
    )
  ) {
    return "failed";
  }
  return null;
}
