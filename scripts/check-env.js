/**
 * Pre-deployment secret and environment variable linter.
 * Scans code to ensure sensitive credentials are not accidentally hardcoded.
 */
const fs = require('fs');
const path = require('path');

const SUSPICIOUS_PATTERNS = [
  { name: 'Supabase Service Role Key', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]{30,}\.[a-zA-Z0-9_-]{30,}/ },
  { name: 'Google API Key', regex: /AIzaSy[0-9A-Za-z-_]{33}/ },
  { name: 'Postgres Connection Password', regex: /postgres(?:ql)?:\/\/[a-zA-Z0-9_.-]+:([a-zA-Z0-9!@#$%^&*()_+~=-]+)@/ },
  { name: 'Private Key Block', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

const IGNORED_DIRS = new Set(['.git', '.next', 'node_modules', '.gemini', 'docs']);
const IGNORED_FILES = new Set(['.env.example', 'check-env.js']);

function isIgnoredFile(file) {
  if (IGNORED_FILES.has(file)) return true;
  // Local env files are intentionally gitignored and hold local developer secrets
  if (file.startsWith('.env') && file !== '.env.example') return true;
  return false;
}

let violations = 0;

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relPath = path.relative(process.cwd(), fullPath);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORED_DIRS.has(file)) {
        scanDir(fullPath);
      }
    } else {
      if (isIgnoredFile(file)) continue;
      // Only scan code / config files
      if (!/\.(tsx?|jsx?|json|sql|ya?ml|env.*)$/.test(file)) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.regex.test(content)) {
          console.error(`❌ [LEAK DETECTED] ${pattern.name} found in ${relPath}`);
          violations++;
        }
      }
    }
  }
}

console.log('🔍 Scanning repository for hardcoded secrets and credentials...');
scanDir(process.cwd());

if (violations > 0) {
  console.error(`\n🚨 Failed: Found ${violations} suspicious hardcoded credential(s).`);
  process.exit(1);
} else {
  console.log('✅ Clean: No hardcoded secrets or raw API keys detected in source code.');
  process.exit(0);
}
