const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server.ts');
let content = fs.readFileSync(serverFile, 'utf8');

// Replace config. with initialConfig. in the logic block
const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('const catalogItems = aiData.catalog'));
const endIdx = lines.findIndex(l => l.includes('// Save HTML to file'));

if (startIdx !== -1 && endIdx !== -1) {
  for (let i = startIdx; i < endIdx; i++) {
    lines[i] = lines[i].replace(/config\./g, 'initialConfig.');
  }
  fs.writeFileSync(serverFile, lines.join('\n'), 'utf8');
  console.log("Replaced config. with initialConfig.");
} else {
  console.error("Could not find logic block bounds");
}
