const UNIT_MS = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };

// Parses "10m" / "2h" / "3d" / "1w" into milliseconds. Returns null if the
// string doesn't match, so callers can reply with a usage hint.
export function parseDuration(input) {
  const match = /^(\d+)(m|h|d|w)$/i.exec(input.trim());
  if (!match) return null;
  const [, amountStr, unit] = match;
  return Number(amountStr) * UNIT_MS[unit.toLowerCase()];
}
