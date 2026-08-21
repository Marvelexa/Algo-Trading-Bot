const fs = require('fs');

const path = 'C:\\Users\\Prince\\OneDrive\\Desktop\\wacrm\\New folder\\CRM2\\src\\lib\\flows\\engine.ts';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('sendButtonsAndSuspend') && line.includes('function')) {
    console.log(`Found sendButtonsAndSuspend at line ${idx + 1}:`);
    console.log(lines.slice(idx, idx + 45).join('\n'));
  }
});
