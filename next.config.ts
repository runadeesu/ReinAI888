import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // reinai-code/ and reinai-admin/ are fully separate projects living inside
  // this repo — without this, Next's output file tracer sweeps their
  // node_modules/dist into the standalone build. reinai-code once blew the
  // deploy past Netlify's upload size limit with an 80MB+ .exe that had
  // nothing to do with the web app.
  outputFileTracingExcludes: {
    "*": ["reinai-code/**", "reinai-admin/**"],
  },
};

export default nextConfig;
