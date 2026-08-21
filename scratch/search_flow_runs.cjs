const fs = require('fs');

const path = 'C:\\Users\\Prince\\OneDrive\\Desktop\\wacrm\\New folder\\CRM2\\src\\lib\\flows\\engine.ts';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('flow_runs') && (line.includes('insert') || line.includes('upsert') || line.includes('create'))) {
    console.log(`Found flow_runs action at line ${idx + 1}:`);
    console.log(lines.slice(Math.max(0, idx - 5), idx + 20).join('\n'));
  }
});
