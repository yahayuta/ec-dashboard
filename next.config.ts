import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Small self-contained server for the container image (see Dockerfile).
  output: "standalone",
  // The BigQuery client is only used on the server; keep it out of the bundle.
  serverExternalPackages: ["@google-cloud/bigquery"],
  poweredByHeader: false,
};

export default nextConfig;
