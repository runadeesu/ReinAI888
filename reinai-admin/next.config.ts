import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app has its own lockfile inside the main ReinAI repo, so Next's
  // root-detection would otherwise pick the parent repo's lockfile and warn
  // about it on every build.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
