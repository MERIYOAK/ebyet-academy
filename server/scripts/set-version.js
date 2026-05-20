#!/usr/bin/env node
/**
 * Stamps the current git SHA into server/.env as BUILD_HASH / BUILD_TIME / APP_VERSION.
 * Run this once before starting the server on each new deployment.
 *
 * Usage:
 *   node scripts/set-version.js
 *   npm run set-version
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const serverRoot = path.join(__dirname, '..');
const repoRoot = path.join(serverRoot, '..');
const envPath = path.join(serverRoot, '.env');

// --- Build hash ---
let buildHash;
try {
  buildHash = execSync('git rev-parse --short HEAD', { cwd: repoRoot }).toString().trim();
} catch {
  buildHash = `build-${Date.now()}`;
  console.warn('⚠️  Could not read git SHA — using timestamp as build hash');
}

const buildTime = new Date().toISOString();
const pkg = JSON.parse(fs.readFileSync(path.join(serverRoot, 'package.json'), 'utf8'));

// --- Update .env ---
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

function setVar(content, key, value) {
  const re = new RegExp(`^${key}=.*$`, 'm');
  return re.test(content)
    ? content.replace(re, `${key}=${value}`)
    : content.trimEnd() + `\n${key}=${value}\n`;
}

envContent = setVar(envContent, 'BUILD_HASH', buildHash);
envContent = setVar(envContent, 'BUILD_TIME', buildTime);
envContent = setVar(envContent, 'APP_VERSION', pkg.version);

fs.writeFileSync(envPath, envContent);

console.log('✅ server/.env updated:');
console.log(`   BUILD_HASH   = ${buildHash}`);
console.log(`   BUILD_TIME   = ${buildTime}`);
console.log(`   APP_VERSION  = ${pkg.version}`);
