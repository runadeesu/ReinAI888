// Deterministic hash -> hue, so the same tag name always renders the same color.
const PALETTE = [
  { bg: "rgb(254 226 226)", fg: "rgb(153 27 27)", bgDark: "rgb(69 26 26)", fgDark: "rgb(252 165 165)" },
  { bg: "rgb(255 237 213)", fg: "rgb(154 52 18)", bgDark: "rgb(69 38 15)", fgDark: "rgb(253 186 116)" },
  { bg: "rgb(254 249 195)", fg: "rgb(133 77 14)", bgDark: "rgb(66 55 12)", fgDark: "rgb(253 224 71)" },
  { bg: "rgb(220 252 231)", fg: "rgb(22 101 52)", bgDark: "rgb(18 58 32)", fgDark: "rgb(134 239 172)" },
  { bg: "rgb(204 251 241)", fg: "rgb(17 94 89)", bgDark: "rgb(16 60 56)", fgDark: "rgb(94 234 212)" },
  { bg: "rgb(219 234 254)", fg: "rgb(30 64 175)", bgDark: "rgb(23 45 82)", fgDark: "rgb(147 197 253)" },
  { bg: "rgb(237 233 254)", fg: "rgb(91 33 182)", bgDark: "rgb(46 32 82)", fgDark: "rgb(196 181 253)" },
  { bg: "rgb(252 231 243)", fg: "rgb(157 23 77)", bgDark: "rgb(69 22 47)", fgDark: "rgb(249 168 212)" },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function tagColor(tag: string) {
  return PALETTE[hashString(tag) % PALETTE.length];
}
