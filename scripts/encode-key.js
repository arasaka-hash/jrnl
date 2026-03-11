#!/usr/bin/env node

/**
 * Helper script to encode service account JSON key to base64
 * Usage: node scripts/encode-key.js [path-to-key.json]
 */

const fs = require('fs');
const path = require('path');

const keyPath = process.argv[2] || './service-account-key.json';

try {
  if (!fs.existsSync(keyPath)) {
    console.error(`Error: File not found: ${keyPath}`);
    console.log('\nUsage: node scripts/encode-key.js [path-to-key.json]');
    process.exit(1);
  }

  const keyContent = fs.readFileSync(keyPath, 'utf-8');
  const base64Key = Buffer.from(keyContent).toString('base64');
  
  console.log('\n✅ Base64 encoded service account key:\n');
  console.log(base64Key);
  console.log('\n📋 Copy this value and paste it into Vercel as GOOGLE_SERVICE_ACCOUNT_KEY environment variable.\n');
} catch (error) {
  console.error('Error encoding key:', error.message);
  process.exit(1);
}
