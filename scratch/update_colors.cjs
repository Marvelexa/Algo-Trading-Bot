const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server.ts');
let content = fs.readFileSync(serverFile, 'utf8');

// 1. Replace the generateUnsplashUrl function
const newUnsplashFn = `function generateUnsplashUrl(keyword, width, height, colorHex) {
  // Using LoremFlickr as it is fully free, supports keywords, and doesn't rate-limit (402) like Pollinations AI
  return \`https://loremflickr.com/\${width}/\${height}/\${encodeURIComponent(keyword)}?random=\${Math.random()}\`;
}`;
content = content.replace(/function generateUnsplashUrl[\s\S]*?\n\}/, newUnsplashFn);

// 2. Fix the replacement logic to pick a palette
const oldReplacement = `      // Replace HTML variables
      let htmlContent = OUTREACH_ECOMMERCE_TEMPLATE;
      const finalNiche = aiData.detectedNiche || "business";
      htmlContent = htmlContent
        .replaceAll('__COLOR_ACCENT__', initialConfig.colorHex)
        .replaceAll('__COLOR_SECONDARY__', initialConfig.colorSecondaryHex || '#4B5563')
        .replaceAll('__COLOR_BACKGROUND__', initialConfig.colorBackground || '#ffffff')
        .replaceAll('__COLOR_TEXT__', initialConfig.colorText || '#111827')`;

const newReplacement = `      // Select a random color palette from the niche's config
      const palettes = initialConfig.colorPalettes || [];
      const palette = palettes[Math.floor(Math.random() * palettes.length)] || { accent: '#3b82f6', secondary: '#1e40af', darkAccent: '#1e3a8a' };
      
      let colorBg = '#ffffff';
      let colorText = '#111827';
      
      if (initialConfig.themeStyle === 'dark-tech') {
        colorBg = '#0f172a';
        colorText = '#ffffff';
      } else if (initialConfig.themeStyle === 'cream') {
        colorBg = '#faf9f6';
        colorText = '#2d3748';
      }
      
      if (palette.bg) colorBg = palette.bg;

      // Replace HTML variables
      let htmlContent = OUTREACH_ECOMMERCE_TEMPLATE;
      const finalNiche = aiData.detectedNiche || "business";
      htmlContent = htmlContent
        .replaceAll('__COLOR_ACCENT__', palette.accent)
        .replaceAll('__COLOR_SECONDARY__', palette.secondary)
        .replaceAll('__COLOR_BACKGROUND__', colorBg)
        .replaceAll('__COLOR_TEXT__', colorText)`;

content = content.replace(oldReplacement, newReplacement);

// Fix the generateUnsplashUrl calls in the HTML replacements:
content = content.replaceAll(', initialConfig.colorHex))', ', palette.accent))');
content = content.replaceAll(', initialConfig.colorSecondaryHex))', ', palette.secondary))');

fs.writeFileSync(serverFile, content);
console.log("Updated colors and images");
