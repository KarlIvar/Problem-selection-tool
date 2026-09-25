export type RatingLike = { kind: string; number: number | null; contestId: string };

export type RatingSummary = {
  contestId: string;
  count: number;
  numbers: number[];
  median: number | null;
  mean: number | null;
  tooEasy: number;
  tooHard: number;
  unknown: number;
};

export function summarizeRatings(ratings: RatingLike[], contestIds: string[]): Record<string, RatingSummary> {
  const out: Record<string, RatingSummary> = {};
  for (const id of contestIds) {
    out[id] = { contestId: id, count: 0, numbers: [], median: null, mean: null, tooEasy: 0, tooHard: 0, unknown: 0 };
  }
  for (const r of ratings) {
    const s = out[r.contestId];
    if (!s) continue;
    s.count++;
    if (r.kind === "NUMBER" && r.number != null) s.numbers.push(r.number);
    else if (r.kind === "TOO_EASY") s.tooEasy++;
    else if (r.kind === "TOO_HARD") s.tooHard++;
    else s.unknown++;
  }
  for (const s of Object.values(out)) {
    if (s.numbers.length) {
      const sorted = [...s.numbers].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      s.median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      s.mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    }
  }
  return out;
}

/** Short human label, e.g. "3.5" or "3 · easy×2" or "—". */
export function ratingLabel(s: RatingSummary | undefined): string {
  if (!s || s.count === 0) return "—";
  const parts: string[] = [];
  if (s.median != null) parts.push(`P${Number.isInteger(s.median) ? s.median : s.median.toFixed(1)}`);
  if (s.tooEasy) parts.push(`easy×${s.tooEasy}`);
  if (s.tooHard) parts.push(`hard×${s.tooHard}`);
  if (s.unknown) parts.push(`?×${s.unknown}`);
  return parts.join(" ");
}
