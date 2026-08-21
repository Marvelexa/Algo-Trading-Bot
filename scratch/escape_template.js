import fs from 'fs';
const content = fs.readFileSync('scratch/ecommerce_template.html', 'utf-8');
const escaped = content.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
fs.writeFileSync('scratch/ecommerce_template_escaped.txt', escaped, 'utf-8');
console.log('Successfully escaped template and saved to scratch/ecommerce_template_escaped.txt');
