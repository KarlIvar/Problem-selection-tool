export function fmtDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function randomCode(len = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  // Browsers submit textarea content with CRLF line endings; store LF so edits compare cleanly.
  return typeof v === "string" ? v.replace(/\r\n?/g, "\n") : "";
}
