#!/usr/bin/env node

/**
 * Security Scanner for QENDIEL Academy
 * Scans the codebase for potential security vulnerabilities
 */

const fs = require('fs');
const path = require('path');

// Patterns to detect potential secrets
const SECRET_PATTERNS = [
  // MongoDB connection strings
  { pattern: /mongodb\+srv:\/\/[^@]+@[^"]+/, name: 'MongoDB Connection String' },
  
  // API Keys
  { pattern: /sk_[a-zA-Z0-9_]+/, name: 'Stripe Secret Key' },
  { pattern: /pk_[a-zA-Z0-9_]+/, name: 'Stripe Publishable Key' },
  { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key ID' },
  { pattern: /ghp_[a-zA-Z0-9_]+/, name: 'GitHub Personal Access Token' },
  { pattern: /gho_[a-zA-Z0-9_]+/, name: 'GitHub OAuth Token' },
  { pattern: /ghu_[a-zA-Z0-9_]+/, name: 'GitHub User-to-Server Token' },
  { pattern: /ghs_[a-zA-Z0-9_]+/, name: 'GitHub Server-to-Server Token' },
  { pattern: /ghr_[a-zA-Z0-9_]+/, name: 'GitHub Refresh Token' },
  
  // JWT Secrets
  { pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/, name: 'JWT Token' },
  
  // Common password patterns
  { pattern: /password['"]?\s*[:=]\s*['"][^'"]{6,}['"]/, name: 'Hardcoded Password' },
  { pattern: /secret['"]?\s*[:=]\s*['"][^'"]{6,}['"]/, name: 'Hardcoded Secret' },
];

// Directories to exclude
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'out',
  'coverage',
  '.nyc_output',
  '.cache',
  'uploads',
  'temp',
  'tmp'
];

// File extensions to scan
const SCAN_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.yml', '.yaml'
];

// Files that are allowed to contain example/placeholder secrets
const ALLOWED_FILES = [
  'SECURITY_GUIDE.md',
  'README.md',
  'env.example',
  '*.md', // Documentation files
  'test-*.js', // Test files
  '*-test.js',
  '*.test.js',
  '*.spec.js'
];

let issuesFound = 0;
let criticalIssues = 0;

function shouldExcludeDir(dirPath) {
  return EXCLUDE_DIRS.some(excludeDir => 
    dirPath.includes(excludeDir) || path.basename(dirPath) === excludeDir
  );
}

function shouldScanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SCAN_EXTENSIONS.includes(ext);
}

function isAllowedFile(filePath) {
  const fileName = path.basename(filePath);
  return ALLOWED_FILES.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(fileName);
    }
    return fileName === pattern;
  });
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const isAllowed = isAllowedFile(filePath);
    
    lines.forEach((line, lineNumber) => {
      SECRET_PATTERNS.forEach(({ pattern, name }) => {
        if (pattern.test(line)) {
          issuesFound++;
          
          if (isAllowed) {
            console.log(`📝 ${name} found in documentation/test file: ${filePath}:${lineNumber + 1}`);
            console.log(`   Line: ${line.trim()}`);
            console.log(`   ⚠️  This appears to be an example/placeholder value`);
            console.log('');
          } else {
            criticalIssues++;
            console.log(`🚨 CRITICAL: ${name} detected in ${filePath}:${lineNumber + 1}`);
            console.log(`   Line: ${line.trim()}`);
            console.log(`   ⚠️  This needs immediate attention!`);
            console.log('');
          }
        }
      });
    });
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
  }
}

function scanDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!shouldExcludeDir(fullPath)) {
          scanDirectory(fullPath);
        }
      } else if (stat.isFile() && shouldScanFile(fullPath)) {
        scanFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
  }
}

function main() {
  console.log('🔍 Security Scanner for Persi Academy');
  console.log('=====================================\n');
  
  const startTime = Date.now();
  const rootDir = process.cwd();
  
  console.log(`Scanning directory: ${rootDir}\n`);
  
  scanDirectory(rootDir);
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log('=====================================');
  console.log(`Scan completed in ${duration.toFixed(2)} seconds`);
  
  if (criticalIssues === 0) {
    console.log('✅ No critical security issues found!');
    if (issuesFound > 0) {
      console.log(`📝 Found ${issuesFound} examples/placeholders in documentation (acceptable)`);
    }
  } else {
    console.log(`🚨 Found ${criticalIssues} CRITICAL security issue(s) that need immediate attention!`);
    console.log(`📝 Found ${issuesFound - criticalIssues} examples/placeholders in documentation (acceptable)`);
    console.log('\n⚠️  Please review and fix the critical issues before committing code.');
    console.log('📖 See SECURITY_GUIDE.md for best practices.');
    process.exit(1);
  }
}

// Run the scanner
main();
