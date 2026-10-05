import type { NextConfig } from "next";

// The page is built as a static page and reads its data from public/data; no other setting is needed.
const nextConfig: NextConfig = {
  // In some setups "next dev" writes AGENTS.md and CLAUDE.md files into the project root
  // by itself. This switch turns that off, so no unrelated files appear in the project.
  agentRules: false,
};

export default nextConfig;
