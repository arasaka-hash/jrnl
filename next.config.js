/** @type {import('next').NextConfig} */
const path = require("path");
require("dotenv").config({
  path: path.resolve(process.cwd(), ".env.local"),
  override: true,
});

const nextConfig = {
  transpilePackages: ["three"],
  env: {
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
  },
};

module.exports = nextConfig;
