const GSM_CHARS =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

export type SmsSegmentInfo = {
  encoding: "gsm" | "unicode";
  characters: number;
  segments: number;
  remainingInSegment: number;
};

function isGsm(text: string): boolean {
  for (const char of text) {
    if (!GSM_CHARS.includes(char)) {
      return false;
    }
  }
  return true;
}

export function countSmsSegments(text: string): SmsSegmentInfo {
  const encoding = isGsm(text) ? "gsm" : "unicode";
  const characters = [...text].length;
  const singleLimit = encoding === "gsm" ? 160 : 70;
  const concatLimit = encoding === "gsm" ? 153 : 67;

  if (characters === 0) {
    return {
      encoding,
      characters,
      segments: 0,
      remainingInSegment: singleLimit,
    };
  }

  if (characters <= singleLimit) {
    return {
      encoding,
      characters,
      segments: 1,
      remainingInSegment: singleLimit - characters,
    };
  }

  const segments = Math.ceil(characters / concatLimit);
  const usedInLast = characters % concatLimit || concatLimit;

  return {
    encoding,
    characters,
    segments,
    remainingInSegment: concatLimit - usedInLast,
  };
}
