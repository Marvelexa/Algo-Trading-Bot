const fs = require('fs');

const html = fs.readFileSync('scratch/ddg_output.html', 'utf8');

// Find occurrences of "emergent"
const regex = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
let match;
while ((match = regex.exec(html)) !== null) {
  if (match[0].toLowerCase().includes('emergent')) {
    console.log('--- FOUND EMERGENT LINK ---');
    console.log('Href:', match[1]);
    console.log('Outer HTML:', match[0].substring(0, 300));
  }
}
