#!/usr/bin/env node
/**
 * Generates version.json for deployment change detection.
 * Run before `vite build` via the `build:version` npm script.
 *
 * Writes:
 *   public/version.json  — served as a static asset, read by the browser at runtime
 *   .env.local           — VITE_BUILD_HASH / VITE_BUILD_TIME injected into the JS bundle
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const repoRoot = path.join(root, '..');

// --- Build hash: git short SHA, fallback to timestamp ---
let buildHash;
try {
  buildHash = execSync('git rev-parse --short HEAD', { cwd: repoRoot }).toString().trim();
} catch {
  buildHash = `build-${Date.now()}`;
  console.warn('⚠️  Could not read git SHA — using timestamp as build hash');
}

const buildTime = new Date().toISOString();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

// --- Write public/version.json ---
const versionInfo = { version: pkg.version, buildHash, buildTime };
fs.writeFileSync(
  path.join(root, 'public', 'version.json'),
  JSON.stringify(versionInfo, null, 2)
);

// --- Write .env.local so Vite injects the vars into the JS bundle ---
const envLocalPath = path.join(root, '.env.local');
let envLocal = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, 'utf8') : '';

function setVar(content, key, value) {
  const re = new RegExp(`^${key}=.*$`, 'm');
  return re.test(content)
    ? content.replace(re, `${key}=${value}`)
    : content.trimEnd() + `\n${key}=${value}\n`;
}

envLocal = setVar(envLocal, 'VITE_BUILD_HASH', buildHash);
envLocal = setVar(envLocal, 'VITE_BUILD_TIME', buildTime);
fs.writeFileSync(envLocalPath, envLocal);

console.log('✅ Version info generated:');
console.log(`   buildHash : ${buildHash}`);
console.log(`   buildTime : ${buildTime}`);
console.log(`   → public/version.json`);
console.log(`   → .env.local (VITE_BUILD_HASH, VITE_BUILD_TIME)`);
