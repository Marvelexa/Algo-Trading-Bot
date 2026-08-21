const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server.ts');
let lines = fs.readFileSync(serverFile, 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('const isEcommerce = true; // Forced to true to use the new premium layout globally'));
const endIdx = lines.findIndex(l => l.includes('// Save HTML to file'));

if (startIdx !== -1 && endIdx !== -1) {
  lines.splice(startIdx, endIdx - startIdx);
  fs.writeFileSync(serverFile, lines.join('\n'), 'utf8');
  console.log("Removed junk from line " + startIdx + " to " + endIdx);
} else {
  console.log("Could not find bounds", startIdx, endIdx);
}
