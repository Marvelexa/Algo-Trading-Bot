const fs = require('fs');

const routePath = 'C:\\Users\\Prince\\OneDrive\\Desktop\\wacrm\\New folder\\CRM2\\src\\app\\api\\whatsapp\\webhook\\route.ts';
const content = fs.readFileSync(routePath, 'utf8');

const lines = content.split('\n');
console.log('Total lines:', lines.length);

const keywords = ['gemini', 'openai', 'ai_reply', 'prompt', 'generate', 'chat', 'model', 'flow', 'automation'];

keywords.forEach(kw => {
  const matches = [];
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes(kw)) {
      matches.push(idx + 1);
    }
  });
  console.log(`Keyword "${kw}" matches on lines:`, matches.slice(0, 15).join(', '), matches.length > 15 ? `... (${matches.length} total)` : '');
});
