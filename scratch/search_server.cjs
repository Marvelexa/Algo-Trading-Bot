const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'server.ts');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

const keywords = ['OUTREACH_HTML_TEMPLATE'];

console.log('Search Results:');
lines.forEach((line, index) => {
  keywords.forEach(kw => {
    if (line.includes(kw)) {
      console.log(`Line ${index + 1} (${kw}): ${line.trim()}`);
    }
  });
});
