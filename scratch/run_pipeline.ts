import { spawn } from "child_process";

// Simple command-line parser
const args = process.argv.slice(2);
let name = "";
let category = "";
let rating = 4.9;
let reviewsCount = 150;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--name" && i + 1 < args.length) {
    name = args[i + 1];
    i++;
  } else if (args[i] === "--category" && i + 1 < args.length) {
    category = args[i + 1];
    i++;
  } else if (args[i] === "--rating" && i + 1 < args.length) {
    rating = parseFloat(args[i + 1]);
    i++;
  } else if (args[i] === "--reviews" && i + 1 < args.length) {
    reviewsCount = parseInt(args[i + 1], 10);
    i++;
  }
}

if (!name || !category) {
  console.error("Error: Missing required arguments: --name and --category");
  console.log("Usage: npx tsx scratch/run_pipeline.ts --name <Business Name> --category <Category> [--rating <Rating>] [--reviews <ReviewsCount>]");
  process.exit(1);
}

async function runPipeline() {
  const url = "http://127.0.0.1:3000/api/leads/generate-outreach";
  console.log(`[Pipeline CLI] Initiating branding and recording for: "${name}" (${category})`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        leadId: name,
        name,
        category,
        rating,
        reviewsCount
      })
    });

    const data = await res.json() as any;
    if (res.status === 200 && data.success) {
      console.log("\n[Pipeline CLI] SUCCESS!");
      console.log(`- HTML Site Path:  public${data.websiteUrl}`);
      console.log(`- Demo Video Path: public${data.videoUrl}`);
    } else {
      console.error(`\n[Pipeline CLI] FAILED:`, data);
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`\n[Pipeline CLI] Error connecting to local server:`, err.message || err);
    console.log("Please make sure the dev server is running on http://localhost:3000 (npm run dev)");
    process.exit(1);
  }
}

runPipeline();
