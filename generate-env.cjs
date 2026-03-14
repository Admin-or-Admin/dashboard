const fs = require('fs');
const path = require('path');

// Determine the output path (defaults to public/env-config.js for local dev)
// In Docker, we'll want to write it to /usr/share/nginx/html/env-config.js
const outputPath = process.env.ENV_CONFIG_OUTPUT || path.join(__dirname, 'public', 'env-config.js');

const config = {
  VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:8000',
};

const content = `window.env = ${JSON.stringify(config, null, 2)};`;

try {
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, content);
  console.log(`Generated env-config.js at ${outputPath}`);
  console.log(`   VITE_API_URL: ${config.VITE_API_URL}`);
} catch (err) {
  console.error('Failed to generate env-config.js:', err);
  process.exit(1);
}
