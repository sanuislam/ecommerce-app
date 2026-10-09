/** "Size | Chest\nM | 40" → [["Size","Chest"],["M","40"]]. Client-safe. */
export function parseSizeGuide(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((l) => l.split("|").map((c) => c.trim().slice(0, 40)).slice(0, 8));
}
