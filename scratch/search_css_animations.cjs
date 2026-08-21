const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Prince\\.gemini\\antigravity\\brain\\aafba803-fda5-4c08-81cf-0f596fa270c4\\.system_generated\\steps\\10672\\content.md', 'utf8');
const keyframes = [];
const matches = content.match(/@keyframes\s+([a-zA-Z0-9_-]+)/g);
if (matches) {
  matches.forEach(m => {
    if (!keyframes.includes(m)) keyframes.push(m);
  });
}
console.log('Found keyframes:', keyframes);

// Search for classes or animations with transition or animation
const lines = content.split('\n');
console.log('CSS lines count:', lines.length);
process.exit(0);
