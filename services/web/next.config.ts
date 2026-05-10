import type { NextConfig } from 'next';

// Slidesmith Web — minimal Next.js 16 config
// (실제 외부 호출 0; BFF는 server-only fetch — Cycle 2)
// Cycle 1 Fix (Test 🟡): Next 16에서 typedRoutes는 stable로 이동 → experimental 밖으로.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  typedRoutes: true,
};

export default nextConfig;
