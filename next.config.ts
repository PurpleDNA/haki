import type { NextConfig } from 'next';

const config: NextConfig = {
  // A stray lockfile in a parent folder must not change what counts as the project root.
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  serverExternalPackages: ['postgres', 'pdf-lib', '@pdf-lib/fontkit'],
  outputFileTracingIncludes: { '/**': ['./src/assets/**/*'] },
  experimental: { serverActions: { bodySizeLimit: '4.5mb' } },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        // Agreement links carry a secret token, so never leak them to other sites.
        { key: 'Referrer-Policy', value: 'no-referrer' },
      ],
    }];
  },
};
export default config;
