import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: "./public/videos",
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();
  const targetUrl = "http://localhost:3000/templates/ecommerce?name=TEST%20STORE";
  console.log("Navigating to:", targetUrl);
  await page.goto(targetUrl, { waitUntil: "load" });

  // Settle loader
  await page.waitForTimeout(5000);
  console.log("Loader should be done. Starting scroll test...");

  // Print initial height
  const initialHeight = await page.evaluate(() => {
    return {
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      scrollY: window.scrollY
    };
  });
  console.log("Initial height metrics:", initialHeight);

  // Execute scroll down
  console.log("Running scroll down evaluate...");
  await page.evaluate(() => {
    return new Promise((resolve) => {
      const scrollDuration = 5000; // 5 seconds for test
      const start = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / scrollDuration, 1);
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, progress * scrollHeight);
        
        // Log scroll progress to console
        if (elapsed % 1000 < 20) {
          console.log("Scrolling browser side:", window.scrollY, "progress:", progress);
        }

        if (progress >= 1) {
          clearInterval(interval);
          resolve();
        }
      }, 16);
    });
  });

  const finalHeight = await page.evaluate(() => {
    return {
      scrollY: window.scrollY
    };
  });
  console.log("Final scroll Y position:", finalHeight);

  await context.close();
  await browser.close();
}

test().catch(console.error);
