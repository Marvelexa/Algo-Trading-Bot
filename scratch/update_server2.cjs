const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server.ts');
let content = fs.readFileSync(serverFile, 'utf8');

// Replace logic block
const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('const fallbackValues = {'));
const endIdx = lines.findIndex(l => l.includes('const isEcommerce = true;'));

if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
  const newLogic = fs.readFileSync(path.join(__dirname, 'logic.txt'), 'utf8');
  lines.splice(startIdx, endIdx - startIdx, newLogic);
  content = lines.join('\n');
  console.log("Replaced logic block.");
} else {
  console.error("Could not find logic block.");
}

fs.writeFileSync(serverFile, content, 'utf8');
console.log("Update completed.");
