const fs = require('fs');
const path = require('path');
const html = fs.readFileSync('C:\\Users\\Prince\\.gemini\\antigravity\\brain\\aafba803-fda5-4c08-81cf-0f596fa270c4\\nexvora_body.html', 'utf8');

// Find any divs with loading, loader, or transition classes
const lines = html.split('>');
lines.forEach((line) => {
  if (line.includes('load') || line.includes('loader') || line.includes('progress') || line.includes('animate') || line.includes('NEXVORA')) {
    console.log(line.trim().substring(0, 150) + '>');
  }
});
process.exit(0);
