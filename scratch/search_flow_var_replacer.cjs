const fs = require('fs');

const path = 'C:\\Users\\Prince\\OneDrive\\Desktop\\wacrm\\New folder\\CRM2\\src\\lib\\flows\\engine.ts';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const keywords = ['replace', 'interpolate', 'vars', 'template', 'template_name', '{{', '${'];
keywords.forEach(kw => {
  const matches = [];
  lines.forEach((line, idx) => {
    if (line.includes(kw)) {
      matches.push(idx + 1);
    }
  });
  console.log(`Keyword "${kw}" matches on lines:`, matches.slice(0, 15).join(', '));
});
