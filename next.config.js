/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  // Allow access to Docker socket
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'dockerode': 'dockerode'
      });
    }
    return config;
  }
};

module.exports = nextConfig;