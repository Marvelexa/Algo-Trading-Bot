import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.goto('https://www.google.com/maps/place/Starbucks/@40.758895,-73.985131,15z');
  const html = await page.content();
  fs.writeFileSync('test_puppeteer.html', html);
  console.log('Length:', html.length);
  
  // Basic Regex
  const phoneMatch = html.match(/tel:([^\"]+)/);
  console.log('Phone:', phoneMatch ? phoneMatch[1] : null);
  
  const websiteMatch = html.match(/data-item-id=\"authority\".*?href=\"([^\"]+)\"/);
  console.log('Website:', websiteMatch ? websiteMatch[1] : null);
  
  await browser.close();
})();
