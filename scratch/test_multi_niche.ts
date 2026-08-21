import fs from "fs";
import path from "path";

async function generateNiche(name: string, category: string) {
  const url = "http://127.0.0.1:3000/api/leads/generate-outreach";
  console.log(`\n[Test] Requesting generation for: "${name}" (${category})...`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes timeout
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        leadId: name,
        name: name,
        category: category,
        rating: 4.9,
        reviewsCount: 150
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await res.json() as any;
    if (res.status === 200 && data.success) {
      console.log(`[Test] SUCCESS: Generated "${name}" -> ${data.websiteUrl}`);
      return data;
    } else {
      console.error(`[Test] FAILED for "${name}":`, data);
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error(`[Test] Error for "${name}":`, err.message || err);
  }
}

async function runTest() {
  console.log("Starting multi-niche dynamic generation verification test...");
  
  const cafe = await generateNiche("Let's Meet Cafe", "Café");
  const clinic = await generateNiche("Smile Dental Care", "Dental Clinic");
  const auto = await generateNiche("Apex Auto Garage", "Auto Repair");

  console.log("\n--- GENERATION RESULTS ---");
  
  const sanitizeId = (id: string) => id.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  
  const checkFile = (name: string, expectedTheme: string) => {
    const filePath = path.join(process.cwd(), "public", "temp-websites", `${sanitizeId(name)}.html`);
    if (fs.existsSync(filePath)) {
      const html = fs.readFileSync(filePath, "utf-8");
      
      const getVal = (prop: string) => {
        const match = html.match(new RegExp(`${prop}:\\s*([^;\\n\\r}]+)`));
        return match ? match[1].trim() : "Not Found";
      };
      
      console.log(`\n${name}:`);
      console.log(`  File exists:    Yes`);
      console.log(`  Heading Font:   ${getVal("--font-heading")}`);
      console.log(`  Accent Color:   ${getVal("--color-accent")}`);
      console.log(`  Secondary Color: ${getVal("--color-secondary")}`);
      console.log(`  Background:     ${getVal("--color-background")}`);
      console.log(`  Hero Image:     ${html.match(/src="([^"]+unsplash[^"]+)"/)?.[1] || "Not Found"}`);
      console.log(`  Expected theme style check: ${expectedTheme}`);
    } else {
      console.log(`\n${name}: File NOT found at ${filePath}`);
    }
  };

  checkFile("Let's Meet Cafe", "cream");
  checkFile("Smile Dental Care", "clean-light");
  checkFile("Apex Auto Garage", "dark-tech");
}

runTest();
