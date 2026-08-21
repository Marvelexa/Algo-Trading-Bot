import fs from 'fs';

// Read files
let serverContent = fs.readFileSync('server.ts', 'utf-8');
const ecommerceTemplate = fs.readFileSync('scratch/ecommerce_template_escaped.txt', 'utf-8');

// 1. Insert isEcommerceNiche global helper function after getIconSvg
const getIconSvgEnd = `return ICON_LIBRARY.sparkles;\n}`;
const isEcommerceNicheDef = `\n\nfunction isEcommerceNiche(categoryStr: string, finalNiche?: string): boolean {\n  const cat = (categoryStr || "").toLowerCase();\n  const niche = (finalNiche || "").toLowerCase();\n  return (\n    cat.includes("clothing") ||\n    cat.includes("fashion") ||\n    cat.includes("apparel") ||\n    cat.includes("boutique") ||\n    cat.includes("shop") ||\n    cat.includes("store") ||\n    niche === "retail"\n  );\n}`;

if (serverContent.includes(getIconSvgEnd)) {
  serverContent = serverContent.replace(getIconSvgEnd, getIconSvgEnd + isEcommerceNicheDef);
  console.log('1. Added isEcommerceNiche definition after getIconSvg.');
} else {
  console.error('Error: Could not locate getIconSvg end block.');
  process.exit(1);
}

// 2. Insert OUTREACH_ECOMMERCE_TEMPLATE variable after OUTREACH_HTML_TEMPLATE definition
const htmlTemplateEnd = `</html>\`;`;
const ecommerceTemplateVar = `\n\nconst OUTREACH_ECOMMERCE_TEMPLATE = \`${ecommerceTemplate}\`;`;

// Find first occurrence of htmlTemplateEnd in serverContent
const endIdx = serverContent.indexOf(htmlTemplateEnd);
if (endIdx !== -1) {
  const insertPos = endIdx + htmlTemplateEnd.length;
  serverContent = serverContent.slice(0, insertPos) + ecommerceTemplateVar + serverContent.slice(insertPos);
  console.log('2. Inserted OUTREACH_ECOMMERCE_TEMPLATE variable in server.ts.');
} else {
  console.error('Error: Could not locate end of OUTREACH_HTML_TEMPLATE.');
  process.exit(1);
}

// 3. Update htmlContent assignment to conditionally use OUTREACH_ECOMMERCE_TEMPLATE
const oldHtmlContentLine = 'let htmlContent = OUTREACH_HTML_TEMPLATE';
const newHtmlContentLine = `const isEcommerce = isEcommerceNiche(category, config.nicheName);\n      console.log(\`[Outreach Factory] Niche detection: isEcommerce = \${isEcommerce}\`);\n      let htmlContent = isEcommerce ? OUTREACH_ECOMMERCE_TEMPLATE : OUTREACH_HTML_TEMPLATE;`;

if (serverContent.includes(oldHtmlContentLine)) {
  serverContent = serverContent.replace(oldHtmlContentLine, newHtmlContentLine);
  console.log('3. Updated htmlContent assignment with niche switcher.');
} else {
  console.error('Error: Could not locate htmlContent assignment line.');
  process.exit(1);
}

// 4. Update Playwright wait time inside page goto logic
const oldPlaywrightWait = `await page.goto(fileUrl, { waitUntil: "domcontentloaded", timeout: 30000 });\n          await page.waitForTimeout(1000); // Wait for Tailwind rendering`;
const newPlaywrightWait = `await page.goto(fileUrl, { waitUntil: "domcontentloaded", timeout: 30000 });\n          await page.waitForTimeout(1000); // Wait for Tailwind rendering\n\n          const isEcommerce = isEcommerceNiche(category, config.nicheName);\n          if (isEcommerce) {\n            console.log("[Outreach Playwright] E-commerce page detected. Waiting 8.5 seconds for checkout animation...");\n            await page.waitForTimeout(8500);\n          }`;

if (serverContent.includes(oldPlaywrightWait)) {
  serverContent = serverContent.replace(oldPlaywrightWait, newPlaywrightWait);
  console.log('4. Updated Playwright wait timeout logic.');
} else {
  // Let's try with different spacing/line endings if not found
  const oldPlaywrightWaitCRLF = oldPlaywrightWait.replace(/\n/g, '\r\n');
  if (serverContent.includes(oldPlaywrightWaitCRLF)) {
    serverContent = serverContent.replace(oldPlaywrightWaitCRLF, newPlaywrightWait.replace(/\n/g, '\r\n'));
    console.log('4. Updated Playwright wait timeout logic (CRLF).');
  } else {
    console.error('Error: Could not locate Playwright goto wait block.');
    process.exit(1);
  }
}

// Write the modified content back
fs.writeFileSync('server.ts', serverContent, 'utf-8');
console.log('Successfully modified server.ts!');
