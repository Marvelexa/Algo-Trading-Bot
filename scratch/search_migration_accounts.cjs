const fs = require('fs');
const path = require('path');

const crm2Path = 'C:\\Users\\Prince\\OneDrive\\Desktop\\wacrm\\New folder\\CRM2';
const files = fs.readdirSync(crm2Path);

files.forEach(file => {
  if (file.endsWith('.js') && !file.startsWith('node_modules')) {
    const content = fs.readFileSync(path.join(crm2Path, file), 'utf8');
    if (content.includes('account_id') || content.includes('fe7c308b') || content.includes('6b428da4')) {
      console.log(`File "${file}" contains account references!`);
      // Print matches
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('account_id') || line.includes('fe7c308b') || line.includes('6b428da4')) {
          console.log(`  Line ${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
});
