import puppeteer from 'puppeteer';

(async () => {
  console.log("Launching browser to capture white screen errors...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`BROWSER ERROR: ${msg.text()}`);
    } else {
      console.log(`BROWSER LOG: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`BROWSER UNCAUGHT EXCEPTION: ${error.message}`);
  });

  page.on('requestfailed', request => {
    console.log(`BROWSER NETWORK ERROR: ${request.url()} - ${request.failure()?.errorText}`);
  });

  console.log("Navigating to http://localhost:3001/stock/BTCUSD...");
  await page.goto('http://localhost:3001/stock/BTCUSD', { waitUntil: 'networkidle2', timeout: 15000 });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log("Done checking browser.");
  await browser.close();
})();
