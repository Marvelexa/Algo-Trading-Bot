import fs from 'fs';

const html = fs.readFileSync('surat_cafes_html.txt', 'utf8');
const net = fs.readFileSync('surat_cafes_response.txt', 'utf8');

console.log('--- SEARCHING IN HTML ---');
let index = -1;
while ((index = html.toLowerCase().indexOf('sicily osteria', index + 1)) !== -1) {
  console.log(`Match in HTML at index ${index}`);
  console.log(html.substring(index - 200, index + 800));
}

console.log('--- SEARCHING IN NETWORK ---');
index = -1;
while ((index = net.toLowerCase().indexOf('sicily osteria', index + 1)) !== -1) {
  console.log(`Match in Network at index ${index}`);
  console.log(net.substring(index - 200, index + 800));
}
