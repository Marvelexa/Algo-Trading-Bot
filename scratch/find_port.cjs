const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\Prince\\OneDrive\\Desktop\\New folder\\untitled\\server.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('const PORT') || line.includes('let PORT') || line.includes('PORT =') || line.includes('PORT:')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
process.exit(0);
