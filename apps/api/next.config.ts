import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=()' },
  { key: 'Cache-Control', value: 'no-store' },
];

const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['pg'],
  async headers() {
    return [{ source: '/api/:path*', headers: securityHeaders }];
  },
};
export default config;
