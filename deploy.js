const fs = require('fs');
const path = require('path');

const version = Date.now().toString(36);
const root = __dirname;

const swPath = path.join(root, 'service-worker.js');
let sw = fs.readFileSync(swPath, 'utf-8');
sw = sw.replace(
  /CACHE_VERSION = "seven-gold-v[^"]+"/,
  `CACHE_VERSION = "seven-gold-v${version}"`
);
fs.writeFileSync(swPath, sw);

const htmlFiles = fs.readdirSync(root).filter(f => f.endsWith('.html'));
for (const file of htmlFiles) {
  const filePath = path.join(root, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/\?v=\d+/g, `?v=${version}`);
  fs.writeFileSync(filePath, content);
}

console.log(`PWA version auto-updated: seven-gold-v${version}`);
