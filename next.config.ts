import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // z3-solver loads WASM/native binaries — keep it as a native Node require
  serverExternalPackages: ["z3-solver"],

  turbopack: {
    rules: {
      "*.wasm": {
        type: "asset",
      },
    },
  },
};

export default nextConfig;
