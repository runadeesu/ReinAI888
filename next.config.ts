import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // reinai-code/ is a fully separate Electron project living inside this
  // repo (see reinai-code/README.md) — without this, Next's output file
  // tracer sweeps its node_modules/dist/release into the standalone build,
  // which once blew the deploy past Netlify's upload size limit with an
  // 80MB+ .exe that had nothing to do with the web app.
  outputFileTracingExcludes: {
    "*": ["reinai-code/**"],
  },
};

export default nextConfig;
