const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFileSafe(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[copy-chromium-assets] Missing source file: ${src}`);
    return;
  }

  fs.copyFileSync(src, dest);
  console.log(`[copy-chromium-assets] Copied ${path.basename(src)} -> ${dest}`);
}

function main() {
  const projectRoot = process.cwd();
  const srcBinDir = path.join(projectRoot, 'node_modules', '@sparticuz', 'chromium', 'bin');
  const targetBinDir = path.join(projectRoot, '.next', 'server', 'bin');

  if (!fs.existsSync(srcBinDir)) {
    console.warn('[copy-chromium-assets] Sparticuz chromium bin directory not found. Skipping copy.');
    process.exit(0);
  }

  ensureDir(targetBinDir);

  const filesToCopy = [
    'chromium.br',
    'fonts.tar.br',
    'swiftshader.tar.br',
    'al2.tar.br',
    'al2023.tar.br',
  ];

  for (const file of filesToCopy) {
    const src = path.join(srcBinDir, file);
    const dest = path.join(targetBinDir, file);
    copyFileSafe(src, dest);
  }

  console.log('[copy-chromium-assets] Done.');
}

main();
