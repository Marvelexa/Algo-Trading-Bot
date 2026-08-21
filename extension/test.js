const fs = require('fs');
const html = fs.readFileSync('test_maps.html', 'utf8');

let phoneMatches = 0;
let webMatches = 0;

const regexPhone = /\[\s*\"(\+?[0-9\s\-]{8,20})\"\s*\]/g;
let match;
while ((match = regexPhone.exec(html)) !== null) {
   phoneMatches++;
   console.log('Found phone:', match[1]);
}

const regexWeb = /\"(https?:\/\/[^\"]+)\"/g;
while ((match = regexWeb.exec(html)) !== null) {
   if (!match[1].includes('google') && !match[1].includes('gstatic') && !match[1].includes('schema.org')) {
       webMatches++;
       console.log('Found web:', match[1]);
   }
}

console.log('Total Phones:', phoneMatches);
console.log('Total Webs:', webMatches);
