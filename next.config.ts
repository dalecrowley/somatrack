import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self';",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://*.firebaseapp.com https://*.googleapis.com https://gstatic.com;",
              "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.google-analytics.com https://*.firebaseapp.com wss://*.firebaseio.com https://*.box.com;",
              "frame-src 'self' https://*.firebaseapp.com https://*.google.com;",
              "img-src 'self' data: https://*.googleusercontent.com https://*.gstatic.com https://*.boximg.com https://*.box.com;",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://gstatic.com;",
              "font-src 'self' https://fonts.gstatic.com;",
              "object-src 'none';",
            ].join(' '),
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://somatrackdb.firebaseapp.com/__/auth/:path*',
      },
      {
        source: '/__/firebase/init.json',
        destination: 'https://somatrackdb.firebaseapp.com/__/firebase/init.json',
      },
    ];
  },
};

export default nextConfig;
