/**
 * How many SMS a text costs. GSM-7 (plain English): 160 characters, or 153
 * per part when longer. Anything else (Bangla, emoji, ৳) is Unicode: 70, or
 * 67 per part. Client-safe.
 */
const GSM =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€";

export function smsInfo(text: string) {
  let gsmLen = 0;
  let unicode = false;
  for (const ch of text) {
    if (GSM.includes(ch)) gsmLen += 1;
    else if (GSM_EXT.includes(ch)) gsmLen += 2;
    else {
      unicode = true;
      break;
    }
  }
  const chars = unicode ? [...text].length : gsmLen;
  const [one, many] = unicode ? [70, 67] : [160, 153];
  const parts = chars === 0 ? 0 : chars <= one ? 1 : Math.ceil(chars / many);
  return { chars, parts, unicode };
}
