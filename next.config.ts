import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    devIndicators: false,
    // Emits a self-contained server bundle with only the dependencies it
    // actually uses, which is what the Docker image copies.
    output: "standalone",
}

export default nextConfig
