import fs from 'fs';
import path from 'path';

// Ensure dist/200.html exists for Cloudflare Workers / SPA client routing
const distDir = path.resolve('dist');
const indexHtml = path.join(distDir, 'index.html');
const fallbackHtml = path.join(distDir, '200.html');
const redirectsFile = path.join(distDir, '_redirects');

if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, fallbackHtml);
  console.log('✓ Successfully created dist/200.html SPA fallback.');
} else {
  console.warn('⚠️ Warning: dist/index.html not found to generate 200.html.');
}

// Remove any generated _redirects file to prevent Cloudflare loop error 100324
if (fs.existsSync(redirectsFile)) {
  fs.unlinkSync(redirectsFile);
  console.log('✓ Successfully removed dist/_redirects to avoid Cloudflare code 100324.');
}
