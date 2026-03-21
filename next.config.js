/** @type {import('next').NextConfig} */
const path = require("path");
require("dotenv").config({
  path: path.resolve(process.cwd(), ".env.local"),
  override: true,
});

const nextConfig = {
  transpilePackages: ["three"],
  experimental: {
    serverActions: {
      // Photo uploads send base64; ~4MB file → ~5.5MB payload — default 1MB fails
      bodySizeLimit: "8mb",
    },
  },
  env: {
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
  },
};

module.exports = nextConfig;
