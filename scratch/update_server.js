const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server.ts');
let content = fs.readFileSync(serverFile, 'utf8');

// 1. Replace the OUTREACH_ECOMMERCE_TEMPLATE
const templateContent = fs.readFileSync(path.join(__dirname, 'ultimate_template.html'), 'utf8');
const templateRegex = /const OUTREACH_ECOMMERCE_TEMPLATE = `[\s\S]*?`;\n/g;
if (content.match(templateRegex)) {
  content = content.replace(templateRegex, `const OUTREACH_ECOMMERCE_TEMPLATE = \`${templateContent}\`;\n`);
  console.log("Replaced OUTREACH_ECOMMERCE_TEMPLATE");
} else {
  console.error("Could not find OUTREACH_ECOMMERCE_TEMPLATE");
}

// 2. Replace the AI Prompt and Schema
const newPrompt = `const websitePrompt = \`
Generate a JSON object containing highly customized, authentic marketing copy for a premium landing page built specifically for a business named "\${name}" in the niche "\${category}".

Website/Catalog Context:
\${catalogContext}

Schema Requirements:
- "detectedNiche": One of 'cafe', 'restaurant', 'ecommerce', 'gym', 'salon', 'real estate', 'hotel', etc.
- "heroBadge": Short trust text (e.g. 'Award Winning', 'Top Rated')
- "heroTitle1": Premium 2-4 word headline (e.g. 'Discover True', 'Elevate Your')
- "heroTitleAccent": The punchy end of the headline (e.g. 'Elegance', 'Fitness Journey')
- "heroSubtitle": 2 sentences of high-converting, emotional copy.
- "heroCtaPrimary": e.g. 'Book Appointment', 'Shop Now'
- "heroCtaSecondary": e.g. 'Explore Services', 'Our Menu'
- "heroImageSearch": Unsplash keyword for the main background.
- "heroImage2Search": Unsplash keyword for the showcase card.
- "aboutImageSearch": Unsplash keyword for the about section.
- "trustRating": "4.9", "5.0"
- "trustCustomers": "500", "1k", "10k"
- "trustYears": "10", "15"
- "aboutHeadline": Premium about us headline.
- "aboutParagraph": 2-3 sentences about their history and quality.
- "dynamicBlockTitle": Highly specific to the niche! (e.g. 'Popular Dishes', 'Featured Properties', 'Our Fleet', 'Top Sellers')
- "dynamicBlockSubtitle": A subtitle for the dynamic block.
- "catalog": Array of exactly 6 items. Each item needs: "title", "description", "price" (number), "imageSearchKeyword" (simple unsplash term), and "action" (e.g. 'Add to Cart', 'Book Now', 'View Details').
- "whyHeadline": Headline for Why Choose Us.
- "whyDescription": Short paragraph.
- "whyCards": Array of exactly 4 cards. Each needs: "title", "text", "icon" (lucide icon name: 'shield', 'award', 'zap', 'star', 'heart', 'clock').
- "stat1Value", "stat1Label", "stat2Value", "stat2Label", "stat3Value", "stat3Label", "stat4Value", "stat4Label"
- "gallerySearch1", "gallerySearch2", "gallerySearch3", "gallerySearch4": 4 Unsplash keywords for gallery.
- "reviews": Array of exactly 4 reviews. Each needs: "name", "initial", "text".
- "process1Title", "process1Desc", "process2Title", "process2Desc", "process3Title", "process3Desc"
- "faqItems": Array of exactly 3 FAQs. Each needs: "question", "answer".
- "finalCtaHeadline": Huge ending CTA text.
- "finalCtaButton": e.g. 'Get Started Today'

You MUST respond with a single valid JSON block containing exactly these keys.
\`;

const systemInstruction = \`You are an elite conversion rate optimization (CRO) web designer. 
Your goal is to generate copy for a 'Fake Demo Website' that looks so incredibly premium and specific to the client's industry that they immediately want to buy it.
Use industry-specific terminology for the 'dynamicBlockTitle' (e.g. a car dealer gets 'Featured Inventory', a cafe gets 'Our Signature Menu').
Never use placeholders. Generate highly authentic, beautiful copy.\`;
`;

const promptRegex = /const websitePrompt = `[\s\S]*?const systemInstruction = `[\s\S]*?`;\n/g;
if (content.match(promptRegex)) {
  content = content.replace(promptRegex, newPrompt);
  console.log("Replaced AI Prompts");
} else {
  console.error("Could not find AI Prompts block");
}

fs.writeFileSync(serverFile, content, 'utf8');
console.log("server.ts updated successfully.");
