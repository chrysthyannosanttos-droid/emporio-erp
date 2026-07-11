import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.70.60', 'localhost', '127.0.0.1'],
  devIndicators: false,
  typescript: {
    // Tipo erros tratados como warnings — não bloqueiam o build de produção
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
  },
  async redirects() {
    return [
      {
        source: '/fiscal/tax_grid',
        destination: '/fiscal/tax-grid',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
