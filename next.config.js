/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ⛔ PENTING: jangan static export
  output: "standalone",

  // ⛔ BLOK API dari static generation
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig;
