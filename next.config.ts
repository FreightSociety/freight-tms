import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The bootstrap route reads the generated SQL migration files at runtime
  // (fs.readdirSync/readFileSync against the `drizzle/` folder) rather than
  // importing them, so they aren't picked up by Next's default file tracing
  // for serverless output — this makes sure they're bundled with that route.
  outputFileTracingIncludes: {
    "/api/admin/bootstrap": ["./drizzle/**/*"],
  },
};

export default nextConfig;
