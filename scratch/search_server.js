const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'server.ts');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

const keywords = ['/generate-outreach', 'playwright', 'chromium', 'screenshot', 'pdf', 'goto', 'page.'];

console.log('Search Results:');
lines.forEach((line, index) => {
  keywords.forEach(kw => {
    if (line.toLowerCase().includes(kw.toLowerCase())) {
      console.log(`Line ${index + 1} (${kw}): ${line.trim()}`);
    }
  });
});
