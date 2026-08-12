export function fmt(date) {
  return new Date(date).toLocaleString("ja-JP");
}

// Accepts "YYYY-MM-DD HH:MM" (interpreted in server-local time) or a
// relative shorthand like "2h" / "30m" / "3d" from now.
export function parseDateTime(input) {
  const relative = /^(\d+)(m|h|d)$/i.exec(input.trim());
  if (relative) {
    const mult = { m: 60_000, h: 3_600_000, d: 86_400_000 }[relative[2].toLowerCase()];
    return new Date(Date.now() + Number(relative[1]) * mult);
  }
  const date = new Date(input.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}
