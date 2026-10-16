import { PhoneError } from "./types";

const MOBILE_NATIONAL = /^9\d{8}$/;

export function normalizeEthiopianMobile(input: string): string {
  const raw = input.trim();
  if (!raw) {
    throw new PhoneError("Phone number is empty");
  }

  const compact = raw.replace(/[^\d+]/g, "");
  const digits = compact.startsWith("+")
    ? compact.slice(1).replace(/\D/g, "")
    : compact.replace(/\D/g, "");

  let national = digits;
  if (national.startsWith("251")) {
    national = national.slice(3);
  }
  if (national.startsWith("0")) {
    national = national.slice(1);
  }

  if (!MOBILE_NATIONAL.test(national)) {
    throw new PhoneError(`Not a valid Ethiopian mobile number: ${input}`);
  }

  return `+251${national}`;
}

export function parsePhoneList(input: string): {
  valid: string[];
  invalid: string[];
} {
  const chunks = input
    .split(/[\s,;]+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    try {
      const phone = normalizeEthiopianMobile(chunk);
      if (!seen.has(phone)) {
        seen.add(phone);
        valid.push(phone);
      }
    } catch {
      invalid.push(chunk);
    }
  }

  return { valid, invalid };
}
