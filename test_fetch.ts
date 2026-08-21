import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const url = 'https://www.google.com/maps/place/Sicily+Osteria/data=!4m7!3m6!1s0x3be04f58ad50a581:0x4d538686e06cd2df!8m2!3d21.1718873!4d72.7937402!16s%2Fg%2F11w2b7x537!19sChIJgaVQrVhP4DsR39Js4IaGU00?authuser=0&hl=en&rclk=1';
  
  console.log(`Navigating to ${url} ...`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  await page.waitForTimeout(6000);
  
  // Take screenshot to see if consent screen is blocking
  await page.screenshot({ path: 'sicily_page.png' });
  console.log('Saved screenshot to sicily_page.png');
  
  const text = await page.content();
  console.log(`Contains 'consent': ${text.includes('consent.google.com') || text.includes('Before you continue')}`);
  
  await browser.close();
})();
