const fs = require('fs');

const routePath = 'C:\\Users\\Prince\\OneDrive\\Desktop\\wacrm\\New folder\\CRM2\\src\\app\\api\\whatsapp\\webhook\\route.ts';
const content = fs.readFileSync(routePath, 'utf8');

const lines = content.split('\n');

const search = 'findOrCreateConversation';
lines.forEach((line, idx) => {
  if (line.includes(search) && line.includes('async')) {
    console.log(`Found definition at line ${idx + 1}:`);
    console.log(lines.slice(idx, idx + 25).join('\n'));
  }
});
