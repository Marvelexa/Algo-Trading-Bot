const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  console.log('Navigating to Nexvora...');
  await page.goto('https://nexvora-ud88.onrender.com');
  
  // Wait a small amount of time to capture the loading state
  console.log('Capturing screen during load...');
  await page.waitForTimeout(300);
  const screenshotPath = path.join('C:\\Users\\Prince\\.gemini\\antigravity\\brain\\aafba803-fda5-4c08-81cf-0f596fa270c4', 'nexvora_load.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);
  
  // Wait for the page to fully load and take another screenshot
  console.log('Waiting for load completion...');
  await page.waitForTimeout(4000);
  const loadedPath = path.join('C:\\Users\\Prince\\.gemini\\antigravity\\brain\\aafba803-fda5-4c08-81cf-0f596fa270c4', 'nexvora_loaded.png');
  await page.screenshot({ path: loadedPath });
  console.log('Loaded screenshot saved to:', loadedPath);

  // Print page title and outer HTML of body during load if possible
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log('HTML length:', html.length);
  fs = require('fs');
  fs.writeFileSync(path.join('C:\\Users\\Prince\\.gemini\\antigravity\\brain\\aafba803-fda5-4c08-81cf-0f596fa270c4', 'nexvora_body.html'), html);
  
  await browser.close();
}

run().catch(console.error);
