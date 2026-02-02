const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude Node.js modules from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
      };
      
      // Ignore pdf-parse and mammoth in client bundle
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(pdf-parse|mammoth)$/,
        })
      );
    }
    
    return config;
  },
}

module.exports = nextConfig
