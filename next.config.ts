import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Backward compatibility: old role-specific URLs -> unified dashboard
      { source: '/admin', destination: '/dashboard', permanent: true },
      { source: '/admin/:path*', destination: '/dashboard/:path*', permanent: true },
      { source: '/coach', destination: '/dashboard', permanent: true },
      { source: '/coach/:path*', destination: '/dashboard/:path*', permanent: true },
      { source: '/athlete', destination: '/dashboard', permanent: true },
      { source: '/athlete/:path*', destination: '/dashboard/:path*', permanent: true },
      { source: '/parent', destination: '/dashboard', permanent: true },
      { source: '/parent/:path*', destination: '/dashboard/:path*', permanent: true },
      { source: '/super-admin', destination: '/dashboard', permanent: true },
      { source: '/super-admin/:path*', destination: '/dashboard/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
