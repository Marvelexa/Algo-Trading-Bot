const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\Prince\\OneDrive\\Desktop\\New folder\\untitled\\server.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('fs.writeFile') || line.includes('fs.writeFileSync')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
process.exit(0);
