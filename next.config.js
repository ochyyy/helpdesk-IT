/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ⛔️ PENTING: jangan static export
  output: "standalone",
};

module.exports = nextConfig;
