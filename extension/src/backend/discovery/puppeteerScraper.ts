import puppeteer, { Browser, Page } from 'puppeteer';
import { networkInterceptor } from '../extraction/networkInterceptor';
import { domExtractor } from '../extraction/domExtractor';
import { leadProcessor, ProcessedLead, RawLead } from '../processing/leadProcessor';
import { checkpointManager } from '../storage/jobs/checkpointManager';

export class PuppeteerScraper {
  private browser: Browser | null = null;

  public async startBrowser() {
    this.browser = await puppeteer.launch({
      headless: false, // Run non-headless to avoid immediate bot detection, and useful for user observation
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
    });
  }

  public async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  public async scrapeCity(query: string, jobId: string): Promise<ProcessedLead[]> {
    if (!this.browser) await this.startBrowser();
    
    const page = await this.browser!.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Setup Nexvora-style Network Interception
    networkInterceptor.attach(page);
    
    let allLeads: ProcessedLead[] = [];
    
    try {
      await page.goto('https://www.google.com/maps', { waitUntil: 'networkidle2' });
      
      // Type and search
      await page.waitForSelector('#searchboxinput');
      await page.type('#searchboxinput', query);
      await page.keyboard.press('Enter');
      
      // Wait for results
      await page.waitForSelector('div[role="article"]', { timeout: 15000 });
      
      // Scroll to load all
      let previousHeight = 0;
      let scrollAttempts = 0;
      let hasMore = true;
      
      while (hasMore && scrollAttempts < 50) {
        hasMore = await page.evaluate(() => {
          const feed = document.querySelector('div[role="feed"]');
          if (feed) {
            feed.scrollTop = feed.scrollHeight;
            return !document.body.innerText.includes("You've reached the end of the list");
          }
          return false;
        });
        
        await new Promise(r => setTimeout(r, 2000));
        
        // Extract dynamically as we scroll
        const domLeads = await domExtractor.extractFromSidebar(page);
        const pbLeads = networkInterceptor.getExtractedLeads(); // Priority 1
        
        const rawLeads = [...pbLeads, ...domLeads];
        
        for (const raw of rawLeads) {
          const processed = await leadProcessor.processLead(raw);
          if (processed) {
            allLeads.push(processed);
            // Update checkpoint
            const cp = checkpointManager.getCheckpoint(jobId);
            if (cp) {
              checkpointManager.updateProgress(jobId, { leadsCollected: cp.leadsCollected + 1 });
            }
          }
        }
        
        const feedHeight = await page.evaluate(() => {
          const feed = document.querySelector('div[role="feed"]');
          return feed ? feed.scrollHeight : 0;
        });
        
        if (feedHeight === previousHeight) {
          scrollAttempts++;
        } else {
          scrollAttempts = 0;
          previousHeight = feedHeight;
        }
      }
      
    } catch (e) {
      console.error(`Error scraping city ${query}:`, e);
      throw e;
    } finally {
      await page.close();
    }
    
    return allLeads;
  }
}

export const puppeteerScraper = new PuppeteerScraper();
