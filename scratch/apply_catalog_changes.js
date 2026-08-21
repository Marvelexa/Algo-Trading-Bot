import fs from 'fs';

// Read server.ts
let content = fs.readFileSync('server.ts', 'utf-8');

// 1. Define helper functions
const isEcommerceNicheEnd = `    niche === "retail"\n  );\n}`;
const newHelpers = `\n\nasync function extractWebsiteCatalog(url: string): Promise<string> {\n  if (!url) return "No website provided.";\n  console.log(\`[Outreach Factory] Scopes scraping website catalog from: \${url}\`);\n  const { chromium } = await import("playwright");\n  const browser = await chromium.launch({ headless: true });\n  try {\n    const context = await browser.newContext({\n      viewport: { width: 1280, height: 800 },\n      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"\n    });\n    const page = await context.newPage();\n    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });\n    \n    const pageData = await page.evaluate(() => {\n      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4")).map(h => h.textContent?.trim()).filter(Boolean).slice(0, 15);\n      const links = Array.from(document.querySelectorAll("a")).map(a => a.textContent?.trim()).filter(t => t && t.length > 3 && t.length < 30).slice(0, 20);\n      const bodyText = document.body.innerText || "";\n      \n      const lines = bodyText.split("\\n").map(l => l.trim()).filter(Boolean);\n      const potentialProducts = lines.filter(l => {\n        return (l.includes("₹") || l.includes("$") || l.includes("Rs") || l.includes("price") || l.includes("Price")) && l.length < 80;\n      }).slice(0, 15);\n      \n      return {\n        headings,\n        links: Array.from(new Set(links)),\n        potentialProducts\n      };\n    });\n    \n    await browser.close();\n    \n    return \`\n    Headings: \${pageData.headings.join(", ")}\n    Links: \${pageData.links.join(", ")}\n    Potential Products/Prices: \${pageData.potentialProducts.join("; ")}\n    \`.slice(0, 1000);\n  } catch (error: any) {\n    console.warn(\`[Outreach Factory] Website scraping failed for \${url}:\`, error.message || error);\n    try { await browser.close(); } catch (e) {}\n    return "Failed to scrape website catalog details.";\n  }\n}\n\nfunction getFashionImage(keyword: string, index: number): string {\n  const kw = (keyword || "").toLowerCase();\n  const mapping: Record<string, string> = {\n    saree: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",\n    lehenga: "https://images.unsplash.com/photo-1610030469668-93535c17b6b3?auto=format&fit=crop&w=600&q=80",\n    anarkali: "https://images.unsplash.com/photo-1608748010899-18f300247112?auto=format&fit=crop&w=600&q=80",\n    kurti: "https://images.unsplash.com/photo-1608748010899-18f300247112?auto=format&fit=crop&w=600&q=80",\n    ethnic: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80",\n    dress: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=600&q=80",\n    suit: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=600&q=80",\n    sneaker: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80",\n    shoe: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80",\n    cake: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80",\n    pastry: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80",\n    jewelry: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80",\n    flower: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=600&q=80",\n    florist: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=600&q=80",\n    furniture: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80"\n  };\n\n  for (const [key, url] of Object.entries(mapping)) {\n    if (kw.includes(key)) {\n      return url;\n    }\n  }\n\n  const defaults = [\n    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80",\n    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80",\n    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80",\n    "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80"\n  ];\n\n  return defaults[index % defaults.length];\n}`;

if (content.includes(isEcommerceNicheEnd)) {
  content = content.replace(isEcommerceNicheEnd, isEcommerceNicheEnd + newHelpers);
  console.log('1. Defined extractWebsiteCatalog and getFashionImage.');
} else {
  console.error('Error: Could not locate isEcommerceNicheEnd.');
  process.exit(1);
}

// 2. Insert scraper caller logic in outreach route
const scraperTarget = `      const initialConfig = getNicheConfig(name, category);`;
const scraperAddition = `      // Extract website catalog context first if the lead has a website
      const lead = syncedLeads.find(l => l.name === name || l.mapsUrl === leadId || l.mapsUrl?.includes(leadId));
      const websiteUrl = lead ? lead.website : undefined;
      let catalogContext = "No website available. Generate a catalog of 4 popular, premium products that fit the business name and category.";
      if (websiteUrl && websiteUrl.startsWith("http")) {
        try {
          catalogContext = await extractWebsiteCatalog(websiteUrl);
        } catch (e: any) {
          console.warn("[Outreach Factory] Scopes scraping website catalog failed:", e.message);
        }
      }

`;

if (content.includes(scraperTarget)) {
  content = content.replace(scraperTarget, scraperAddition + scraperTarget);
  console.log('2. Integrated website catalog crawler.');
} else {
  console.error('Error: Could not locate scraperTarget.');
  process.exit(1);
}

// 3. Update prompt to use catalogContext and request catalog array
const promptTarget = `Generate a JSON object containing highly customized, authentic marketing copy and review-centric sections for a business named "\${name}" in the niche "\${category}".\nThis information will populate a premium Awwwards-style bento grid website that acts as a **Google Review Showcase Page**. The site will focus entirely on showcasing customer appreciation, verified Google reviews, and rating metrics.`;

const promptReplacement = `Generate a JSON object containing highly customized, authentic marketing copy and review-centric sections for a business named "\${name}" in the niche "\${category}".
This information will populate a premium storefront website.

Website/Catalog Context (extracted from their live site, if available):
\${catalogContext}

Analyze the website/catalog context:
- If the context lists actual products or services, you MUST extract and use 4 of their real products/services to display in the catalog grid.
- If the context is empty or says "No website available", analyze the business name ("\${name}") and category ("\${category}") and design 4 highly relevant, culturally appropriate premium products (e.g. if the name is an Indian boutique like "Varraja Gallery", use Indian ethnic clothes like Sarees/Lehengas/Anarkali; if it is a modern sneaker store, use sneakers; if it is a bakery, use cakes/pastries).`;

if (content.includes(promptTarget)) {
  content = content.replace(promptTarget, promptReplacement);
  console.log('3. Updated prompt intro.');
} else {
  console.error('Error: Could not locate promptTarget.');
  process.exit(1);
}

// 4. Update Schema in prompt
const schemaTarget = `"heroCtaSecondary": "The secondary call to action text (e.g. 'Read Reviews' or 'View Menu' for a cafe; 'Explore Services' or 'Read Testimonials' for others)",\n  "headerCta": "CTA for header button (e.g. 'Book Table', 'Book Appointment', or 'Get Started')",`;
const schemaReplacement = `"heroCtaSecondary": "The secondary call to action text (e.g. 'Read Reviews' or 'View Menu' for a cafe; 'Explore Services' or 'Read Testimonials' for others)",
  "headerCta": "CTA for header button (e.g. 'Book Table', 'Book Appointment', or 'Get Started')",
  "catalog": [
    {
      "title": "Product or service name (beautiful, specific, e.g. 'Banarasi Silk Saree' or 'Double Choc Cake')",
      "price": 2499,
      "description": "A punchy 1-sentence value proposition detailing quality/comfort/taste",
      "imageSearchKeyword": "A single Unsplash keyword matching the item type (choose from: 'saree', 'lehenga', 'anarkali', 'kurti', 'ethnic', 'dress', 'suit', 'sneaker', 'shoe', 'cake', 'pastry', 'jewelry', 'flower', 'furniture')"
    }
  ],`;

if (content.includes(schemaTarget)) {
  content = content.replace(schemaTarget, schemaReplacement);
  console.log('4. Updated schema definition.');
} else {
  console.error('Error: Could not locate schemaTarget.');
  process.exit(1);
}

// 5. Update system instructions in prompt
const systemInstructionTarget = `- For the service icons ('service1Icon', 'service2Icon', 'service3Icon', 'service4Icon'), you MUST output ONLY one of the exact short string keywords listed in the schema (e.g. 'coffee', 'wrench', 'activity'). Never output raw SVG HTML code.\n- Ensure all copy is production-ready, beautiful, and fully complete (never use placeholders).`;
const systemInstructionReplacement = `- For the service icons ('service1Icon', 'service2Icon', 'service3Icon', 'service4Icon'), you MUST output ONLY one of the exact short string keywords listed in the schema (e.g. 'coffee', 'wrench', 'activity'). Never output raw SVG HTML code.
- For the 'catalog' array, generate exactly 4 products/services. Analyze the business category and name to make them extremely specific and authentic.
- Ensure all copy is production-ready, beautiful, and fully complete (never use placeholders).`;

if (content.includes(systemInstructionTarget)) {
  content = content.replace(systemInstructionTarget, systemInstructionReplacement);
  console.log('5. Updated system instructions.');
} else {
  console.error('Error: Could not locate systemInstructionTarget.');
  process.exit(1);
}

// 6. Define catalogData and replace catalog JSON data placeholder
const htmlContentTarget = `      // Perform placeholders replacement`;
const catalogDataInsert = `      const fallbackCatalog = [
        {
          title: "Signature Denim Jacket",
          price: 2499,
          description: "Premium washed cotton denim with classic styling.",
          imageSearchKeyword: "jacket"
        },
        {
          title: "Minimalist Cotton Tee",
          price: 1299,
          description: "Ultra-soft organic cotton everyday t-shirt.",
          imageSearchKeyword: "tshirt"
        },
        {
          title: "Classic Knit Sweater",
          price: 3200,
          description: "Chunky knit sweater crafted for warmth and style.",
          imageSearchKeyword: "sweater"
        },
        {
          title: "Tailored Linen Blazer",
          price: 4500,
          description: "Breathable tailored linen blazer for any occasion.",
          imageSearchKeyword: "blazer"
        }
      ];

      const catalogData = (jsonData.catalog || fallbackCatalog).map((item: any, idx: number) => {
        return {
          id: idx + 1,
          title: item.title || "Premium Apparel",
          price: typeof item.price === "number" ? item.price : parseInt(String(item.price).replace(/[^0-9]/g, "")) || 1999,
          description: item.description || "Crafted with premium materials and designed for style and comfort.",
          image: getFashionImage(item.imageSearchKeyword || item.title || "", idx),
          colors: item.colorOptions || ["Beige", "Blue", "Black"],
          sizes: item.sizeOptions || ["S", "M", "L", "XL"]
        };
      });

`;

if (content.includes(htmlContentTarget)) {
  content = content.replace(htmlContentTarget, catalogDataInsert + htmlContentTarget);
  console.log('6. Prepared catalogData mapper.');
} else {
  console.error('Error: Could not locate htmlContentTarget.');
  process.exit(1);
}

// 7. Inject replaceAll for [CATALOG_JSON_DATA]
const replaceTarget = `.replaceAll("[LOGO_INITIALS]", jsonData.logoInitials || name.slice(0, 2).toUpperCase())`;
const replaceReplacement = `.replaceAll("[CATALOG_JSON_DATA]", JSON.stringify(catalogData))\n        .replaceAll("[LOGO_INITIALS]", jsonData.logoInitials || name.slice(0, 2).toUpperCase())`;

if (content.includes(replaceTarget)) {
  content = content.replace(replaceTarget, replaceReplacement);
  console.log('7. Injected catalog data placeholder replacer.');
} else {
  console.error('Error: Could not locate replaceTarget.');
  process.exit(1);
}

// Write the modified content back
fs.writeFileSync('server.ts', content, 'utf-8');
console.log('Successfully applied catalog updates to server.ts!');
