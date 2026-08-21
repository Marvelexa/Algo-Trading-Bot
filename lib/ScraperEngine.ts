import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

function extractActualWebsite(url: string | null | undefined): string | null {
  if (!url) return null;
  const clean = url.trim();
  try {
    const urlWithProto = clean.includes('://') ? clean : `https://${clean}`;
    const parsed = new URL(urlWithProto);
    
    // Extract true destination URL from Google redirect wrapper
    if (parsed.hostname.includes('google.') && (parsed.pathname === '/url' || parsed.pathname.endsWith('/url'))) {
      const actualUrl = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (actualUrl) {
        return actualUrl;
      }
    }
  } catch {
    // Return original if parsing fails
  }
  return clean;
}


class PageStateHarvester {
  public static extractFromText(text: string, businessName: string): { phone?: string | null; website?: string | null } {
    const escapedName = businessName.replace(/"/g, '\\"');
    let nameIndex = text.indexOf(`"${escapedName}"`);
    if (nameIndex === -1) {
      nameIndex = text.toLowerCase().indexOf(businessName.toLowerCase());
    }

    if (nameIndex === -1) return {};

    const chunk = text.substring(nameIndex, nameIndex + 4000);

    let phone: string | null = null;
    let website: string | null = null;

    // 1. Check for tel: link in the chunk
    const telMatches = [...chunk.matchAll(/"tel:([^"]+)"/g)];
    if (telMatches.length > 0) {
      phone = telMatches[0][1].trim();
    }

    // 2. Schema telephone match
    if (!phone) {
      const phoneMeta = chunk.match(/itemprop="telephone"\s+content="([^"]+)"/) || chunk.match(/"telephone"\s*:\s*"([^"]+)"/);
      if (phoneMeta && phoneMeta[1]) phone = phoneMeta[1].trim();
    }

    // 3. Search for any quoted numbers in the chunk
    if (!phone) {
      const phoneMatches = [...chunk.matchAll(/"(\+?[0-9][0-9\s\-\(\)]{8,20})"/g)];
      for (const m of phoneMatches) {
        const num = m[1].trim();
        const digitCount = (num.match(/\d/g) || []).length;
        if (digitCount >= 8 && digitCount <= 15 && !num.startsWith('0000') && !num.includes('1970') && !num.includes('2026')) {
          phone = num;
          break;
        }
      }
    }

    // 4. Look for websites
    const webMatches = [...chunk.matchAll(/(?:itemprop="url"|href)="(https?:\/\/[^"]+)"/g)].concat(
        [...chunk.matchAll(/"(https?:\/\/[^"]+)"/g)]
    );
    
    for (const m of webMatches) {
       const url = m[1];
       if (url.startsWith('http') && 
           !url.includes('google.com') && 
           !url.includes('gstatic.com') && 
           !url.includes('schema.org') && 
           !url.includes('w3.org') &&
           !url.includes('youtube.com')) {
           
           if (!url.includes('facebook.com') && !url.includes('instagram.com') && !url.includes('linkedin.com') && !url.includes('twitter.com') && !url.includes('x.com')) {
              website = url;
              break; 
           }
       }
    }

    // Fallback: if no website yet, look for any http link excluding google
    if (!website) {
       for (const m of webMatches) {
         const url = m[1];
         if (url.startsWith('http') && 
             !url.includes('google.com') && 
             !url.includes('gstatic.com') && 
             !url.includes('schema.org') && 
             !url.includes('w3.org')) {
             website = url;
             break;
         }
       }
    }

    return { 
      phone, 
      website: extractActualWebsite(website) 
    };
  }
}




export interface LeadData {
  id: string;
  name: string;
  category: string;
  location: string;
  phone?: string | null;
  website?: string | null;
  mapsUrl: string;
  rating?: number | null;
  reviewsCount?: number;
  score?: number;
  siteStatus?: 'present' | 'missing';
  websiteOpportunityScore?: number;
  source: string;
  coordinates?: { lat: number; lng: number } | null;
  address?: string | null;
  photos?: string[];
}

export class ScraperEngine {
  private browser: Browser | null = null;
  private logs: string[] = [];
  
  public getLogs(): string[] {
    return this.logs;
  }

  private log(message: string) {
    const ts = new Date().toISOString();
    const entry = `[${ts}] ${message}`;
    console.log(entry);
    this.logs.push(entry);
  }

  async init() {
    this.log('Initializing Playwright Browser...');
    this.browser = await chromium.launch({
      headless: false, // Set to false so you can see it open
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async close() {
    if (this.browser) {
      this.log('Closing Playwright Browser...');
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Scrapes leads for a given search query (e.g. "Cafe in Mumbai")
   * utilizing Scrolling and DOM extraction. 
   */
  async scrapeCity(searchQuery: string, city: string, category: string, jobId?: string): Promise<LeadData[]> {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call init() first.");
    }

    const page = await this.browser.newPage();
    const extractedLeads: LeadData[] = [];
    const seenUrls = new Set<string>();

    const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const interceptedPayloads: string[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/search') || url.includes('/batchexecute') || url.includes('/maps/preview/entity')) {
        try {
          const text = await response.text();
          interceptedPayloads.push(text);
        } catch(e) {}
      }
    });

    try {
      this.log(`Navigating to Google Maps directly with search query...`);
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}?hl=en&gl=us`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      const currentUrl = page.url();
      if (!currentUrl.includes('google.com/maps')) {
        this.log(`URL validation failed. Current URL: ${currentUrl}`);
        throw new Error('Failed to load Google Maps.');
      }
      this.log(`Google Maps loaded successfully. URL: ${currentUrl}`);

      // Optional: Click the consent "Accept all" button if it appears
      try {
        const consentBtn = page.locator('button:has-text("Accept all"), button:has-text("I agree")').first();
        if (await consentBtn.isVisible({ timeout: 3000 })) {
          await consentBtn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {} 

      this.log(`Waiting for results panel...`);
      try {
        await page.waitForSelector('a[href*="/maps/place/"]', { timeout: 20000 });
      } catch (e) {
        this.log(`No results found or results panel failed to load for ${searchQuery}.`);
        return [];
      }

      const cardsCount = await page.locator('a[href*="/maps/place/"]').count();
      if (cardsCount === 0) {
        this.log(`Validation failed: No business cards detected for ${searchQuery}.`);
        return [];
      }

      this.log(`Extraction starting for ${searchQuery}...`);
      let hasReachedEnd = false;
      let lastCount = 0;
      let retries = 0;

      while (!hasReachedEnd && retries < 5) {
        const cards = page.locator('a[href*="/maps/place/"]');
        const currentCount = await cards.count();
        
        for (let i = lastCount; i < currentCount; i++) {
          try {
            const card = cards.nth(i);
            const href = await card.getAttribute('href');
            if (href && !seenUrls.has(href)) {
              seenUrls.add(href);
              
              const cardData = await card.evaluate((el: Element) => {
                const container = el.closest('div.Nv2y1d, div.Uaht4b, div.lI9IFe, div.bfdHYd, div.THOPZb, div.rllt__details, div[jscontroller], div[data-result-index], li') || el.parentElement;
                if (!container) return null;
                
                const titleEl = container.querySelector('.qBF1Pd, div.fontHeadlineSmall');
                const businessName = titleEl?.textContent?.trim() || el.getAttribute('aria-label')?.trim() || '';
                
                const textContent = container.textContent || '';
                const ratingMatch = textContent.match(/(\d\.\d)\s*stars?/i) || textContent.match(/(\d\.\d)\(/);
                const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
                const reviewsMatch = textContent.match(/\(([\d,]+)\)/);
                const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1].replace(/,/g, '')) : 0;
                
                let website = '';
                const websiteEl = container.querySelector('a[data-item-id="authority"]') as HTMLAnchorElement;
                if (websiteEl && websiteEl.href) website = websiteEl.href;
                else {
                  const parent = container.parentElement || container;
                  const allLinks = Array.from(parent.querySelectorAll('a'));
                  for (const link of allLinks) {
                    if (link.href && !link.href.includes('google.') && !link.href.startsWith('javascript:')) {
                      website = link.href;
                      break;
                    }
                  }
                }
                
                let address = '';
                const addressIndicators = /\b(rd|road|st|street|nagar|society|plot|shop|floor|block|sector|phase|market|chowk|lane|gali|near|opp|behind|beside|next|above|below|marg|path|circle|square|colony|park|garden|enclave|vihar|puram|abad|pura|wadi|falia|chawk|main|cross|layout|extension|complex|tower|building|bldg|arcade|plaza|mall|center|centre|industrial|estate|area|zone|no\.|g-|ug-)\b/i;
                const lines = textContent.split(/[·⋅\n]/).map(s => s.trim()).filter(Boolean);
                for (const line of lines) {
                  if (addressIndicators.test(line) && !line.includes('stars') && !/^[0-9.]+(?:\s*\([0-9,]+\))?$/.test(line)) {
                    address = line;
                    break;
                  }
                }

                let phone = '';
                const phoneMatch = textContent.match(/\+?\d[\d\s\-\(\)]{8,18}\d/);
                if (phoneMatch) phone = phoneMatch[0].trim();

                // Extract thumbnail photo from listing card
                let thumbnailPhoto = '';
                const imgEls = Array.from(container.querySelectorAll('img'));
                for (const img of imgEls) {
                  const src = img.src || img.getAttribute('src') || '';
                  if (src && (src.includes('googleusercontent.com') || src.includes('ggpht.com')) && !src.includes('=s') ) {
                    thumbnailPhoto = src;
                    break;
                  }
                  // Fallback: any non-icon image with reasonable size
                  if (src && src.startsWith('http') && !src.includes('google.com/maps') && !src.includes('gstatic.com') && img.width > 50) {
                    thumbnailPhoto = src;
                    break;
                  }
                }
                
                return { name: businessName, rating, reviewsCount, website, address, phone, thumbnailPhoto };
              });
              
              if (!cardData || !cardData.name) continue;
              
              let lat = 0, lng = 0;
              const latMatch = href.match(/!3d(-?\d+\.\d+)/);
              const lngMatch = href.match(/!4d(-?\d+\.\d+)/);
              if (latMatch && lngMatch) {
                lat = parseFloat(latMatch[1]);
                lng = parseFloat(lngMatch[1]);
              }

              const actualWebsite = extractActualWebsite(cardData.website);

              extractedLeads.push({
                id: href,
                name: cardData.name.split('·')[0].trim(),
                category: category,
                location: city,
                mapsUrl: href,
                rating: cardData.rating,
                reviewsCount: cardData.reviewsCount,
                source: 'playwright_deep',
                website: actualWebsite,
                address: cardData.address,
                phone: cardData.phone,
                coordinates: lat && lng ? { lat, lng } : null,
                photos: cardData.thumbnailPhoto ? [cardData.thumbnailPhoto] : []
              });
            }
          } catch (e: any) {
            this.log(`Error extracting card ${i}: ${e.message}`);
          }
        }
        
        lastCount = currentCount;

        try {
          const feed = page.locator('div[role="feed"]').first();
          await feed.evaluate(el => el.scrollTo(0, el.scrollHeight));
          await page.waitForTimeout(1500);
        } catch(e) {
          await page.mouse.wheel(0, 5000);
          await page.waitForTimeout(1500);
        }

        const newCount = await page.locator('a[href*="/maps/place/"]').count();
        if (newCount === lastCount) {
          retries++;
          const endTextVisible = await page.locator('text="You\'ve reached the end of the list."').isVisible().catch(()=>false);
          if (endTextVisible) {
            this.log(`Reached the end of the list for ${searchQuery}.`);
            hasReachedEnd = true;
          }
        } else {
          retries = 0;
        }
      }

      this.log(`Surface extraction complete. Total ${extractedLeads.length} leads extracted from ${city}.`);
      this.log(`Starting Click-Through Detail Panel Enrichment...`);

      let CheckpointManagerClass;
      try {
         const cpModule = require('./checkpointManager');
         CheckpointManagerClass = cpModule.checkpointManager;
      } catch(e) {}

      for (let i=0; i<extractedLeads.length; i++) {
         let lead = extractedLeads[i];
         // Check if job was stopped
         if (jobId && CheckpointManagerClass) {
           const cp = CheckpointManagerClass.getCheckpoint(jobId);
           if (cp && cp.status === 'stopped') {
             this.log(`Job ${jobId} was stopped by user.`);
             break;
           }
         }

         if (lead.phone && lead.website && lead.photos && lead.photos.length >= 3) continue;
         
         try {
           // Google Maps uses virtualized lists, so the element might be unloaded.
           // Since surface extraction is done, we can safely navigate directly.
           await page.goto(lead.mapsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
           
           try {
             await page.waitForSelector('button[data-item-id*="phone:tel:"], a[data-item-id="authority"]', { timeout: 8000 });
           } catch (e) {
             await page.waitForTimeout(2000);
           }
           
           const detailData = await page.evaluate(() => {
              let detailPhone = '';
              const phoneBtn = document.querySelector('button[data-item-id*="phone:tel:"]');
              if (phoneBtn) {
                 const match = (phoneBtn.getAttribute('data-item-id') || '').match(/phone:tel:(.+)/);
                 if (match) detailPhone = match[1].trim();
              }
              
              let detailWebsite = '';
              const webEl = document.querySelector('a[data-item-id="authority"]') as HTMLAnchorElement;
              if (webEl && webEl.href) detailWebsite = webEl.href;
              
              let detailAddress = '';
              const addrBtn = document.querySelector('button[data-item-id="address"]');
              if (addrBtn) {
                 const label = addrBtn.getAttribute('aria-label') || '';
                 detailAddress = label.replace(/^Address:\s*/i, '').trim() || addrBtn.textContent?.trim() || '';
              }
              
              // Extract photos from the detail panel
              const detailPhotos: string[] = [];
              const seenPhotos = new Set<string>();
              const allImgs = document.querySelectorAll('img');
              for (const img of allImgs) {
                const src = img.src || '';
                if (src && (src.includes('googleusercontent.com') || src.includes('ggpht.com'))) {
                  // Skip tiny icons (avatars, UI elements) — only want business photos
                  if (img.width >= 80 || img.height >= 80 || src.includes('=w') || src.includes('=s')) {
                    // Normalize to a larger resolution by replacing size params
                    let photoUrl = src;
                    // Google photo URLs often have =w100-h100 or =s100; upgrade to =w800
                    photoUrl = photoUrl.replace(/=w\d+(-h\d+)?(-[a-z]+)*/, '=w800');
                    photoUrl = photoUrl.replace(/=s\d+(-[a-z]+)*/, '=s800');
                    if (!seenPhotos.has(photoUrl)) {
                      seenPhotos.add(photoUrl);
                      detailPhotos.push(photoUrl);
                    }
                  }
                }
                if (detailPhotos.length >= 5) break;
              }
              
              return { detailPhone, detailWebsite, detailAddress, detailPhotos };
           });
           
           if (detailData.detailPhone && !lead.phone) lead.phone = detailData.detailPhone;
           if (detailData.detailWebsite && !lead.website) lead.website = extractActualWebsite(detailData.detailWebsite);
           if (detailData.detailAddress && (!lead.address || lead.address.length < 5)) lead.address = detailData.detailAddress;
           
           // Merge detail photos with existing thumbnail(s), deduplicating
           if (detailData.detailPhotos && detailData.detailPhotos.length > 0) {
             const existingPhotos = lead.photos || [];
             const mergedSet = new Set([...existingPhotos, ...detailData.detailPhotos]);
             lead.photos = Array.from(mergedSet).slice(0, 5);
             this.log(`[Photos] Captured ${lead.photos.length} photos for ${lead.name}`);
           }

           if (!lead.phone || !lead.website || (lead.photos || []).length < 3) {
              const matchingPayloads = interceptedPayloads.slice(-10);
              for (const text of matchingPayloads) {
                 const harvested = PageStateHarvester.extractFromText(text, lead.name);
                 if (harvested.phone && !lead.phone) lead.phone = harvested.phone;
                 if (harvested.website && !lead.website) lead.website = harvested.website;
              }
           }
           
           if (lead.phone || lead.website) {
              this.log(`[Enrichment] Resolved ${lead.name} -> Phone: ${lead.phone || 'N/A'}, Website: ${lead.website || 'N/A'}`);
           }
           
           const backBtn = page.locator('button[jsaction*="pane.header.back"], button[aria-label="Back"], button[aria-label*="Back to"]').first();
           if (await backBtn.isVisible().catch(()=>false)) {
             await backBtn.click();
           } else {
             await page.goBack();
           }
           await page.waitForTimeout(1000);

         } catch(e: any) {
           this.log(`Skipping enrichment for ${lead.name}: ${e.message}`);
         }
      }
      
      this.log(`Deep Extraction complete for ${city}.`);
      
    } catch (error: any) {
      this.log(`Critical Extraction Error for ${city}: ${error.message}`);
    } finally {
      await page.close();
    }

    return extractedLeads;
  }

  async scrapeGoogleDork(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call init() first.");
    }

    const page = await this.browser.newPage();
    const results: Array<{ title: string; url: string; snippet: string }> = [];

    try {
      this.log(`Navigating to Google Search for query: "${query}"`);
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);

      const hasCaptcha = await page.evaluate(() => {
        return document.body.innerHTML.includes('captcha') || document.body.innerHTML.includes('recaptcha') || document.body.innerHTML.includes('detecting unusual traffic');
      });

      if (hasCaptcha) {
        this.log(`Google CAPTCHA challenge detected. Falling back to DuckDuckGo HTML...`);
        await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);
        
        const ddgResults = await page.evaluate(() => {
          const items: any[] = [];
          document.querySelectorAll('.result').forEach(el => {
            const titleEl = el.querySelector('.result__title a');
            const snippetEl = el.querySelector('.result__snippet');
            if (titleEl && snippetEl) {
              items.push({
                title: titleEl.textContent?.trim() || "",
                url: titleEl.getAttribute('href') || "",
                snippet: snippetEl.textContent?.trim() || ""
              });
            }
          });
          return items;
        });
        return ddgResults;
      }

      const googleResults = await page.evaluate(() => {
        const items: any[] = [];
        document.querySelectorAll('div.g').forEach(el => {
          const titleEl = el.querySelector('h3');
          const linkEl = el.querySelector('a');
          const snippetEl = el.querySelector('div[style*="-webkit-line-clamp"], .VwiC3b, .s3v9rd');
          
          if (titleEl && linkEl) {
            items.push({
              title: titleEl.textContent?.trim() || "",
              url: linkEl.getAttribute('href') || "",
              snippet: snippetEl ? snippetEl.textContent?.trim() || "" : ""
            });
          }
        });
        return items;
      });

      results.push(...googleResults);
      this.log(`Extracted ${results.length} results from Google search.`);
    } catch (e: any) {
      this.log(`Error during Google Dorking: ${e.message}`);
    } finally {
      await page.close();
    }

    // Filter results to ensure they match the requested site domain (removes ads like Wix/Namecheap)
    const siteMatch = query.match(/site:([^\s"]+)/);
    const targetDomain = siteMatch ? siteMatch[1].split('/')[0].toLowerCase() : null;

    const decodeUrl = (url: string) => {
      if (url.includes('uddg=')) {
        const parts = url.split('uddg=');
        if (parts.length > 1) {
          try {
            return decodeURIComponent(parts[1].split('&')[0]);
          } catch (e) {}
        }
      }
      return url;
    };

    const cleanResults = results.map(r => {
      const decodedUrl = decodeUrl(r.url);
      return {
        title: r.title,
        url: decodedUrl,
        snippet: r.snippet
      };
    }).filter(r => {
      if (!targetDomain) return true;
      try {
        const urlWithProto = r.url.startsWith('http') || r.url.startsWith('//') ? r.url : `https://${r.url}`;
        const parsedUrl = new URL(urlWithProto.startsWith('//') ? `https:${urlWithProto}` : urlWithProto);
        const host = parsedUrl.hostname.toLowerCase();
        
        // Block sponsored tracking redirects pointing back to duckduckgo
        if (host.includes('duckduckgo.com')) {
          return false;
        }
        
        if (targetDomain === 'x.com') {
          return host.includes('x.com') || host.includes('twitter.com');
        }
        return host.includes(targetDomain);
      } catch (e) {
        const urlLower = r.url.toLowerCase();
        if (urlLower.includes('duckduckgo.com/y.js') || urlLower.includes('duckduckgo.com/l/?')) {
          return false;
        }
        if (targetDomain === 'x.com') {
          return urlLower.includes('x.com') || urlLower.includes('twitter.com');
        }
        return urlLower.includes(targetDomain);
      }
    });

    this.log(`Post-filtered results matching domain "${targetDomain || 'all'}": ${cleanResults.length} / ${results.length}`);
    return cleanResults;
  }

  public static async fetchPhotosForBusiness(name: string, location: string, mapsUrl?: string, category?: string): Promise<string[]> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: 1400, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        locale: 'en-US'
      });
      page = await context.newPage();
      
      const targetUrl = mapsUrl || `https://www.google.com/maps/search/${encodeURIComponent(`${name} ${location || ''}`.trim())}?hl=en&gl=us`;
      console.log(`[ScraperEngine] Fetching photo gallery for ${name} from: ${targetUrl} (category: ${category || 'unknown'})`);
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      // 1. RESOLVE TO PLACE DETAILS PAGE FIRST
      // If we landed on a search result list page, click the first place card to switch to Place Details view (/maps/place/...)
      const firstPlaceCard = page.locator('div[role="article"], a[href*="/place/"], div.Nv2PK, div.hfT2ld').first();
      if (await firstPlaceCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[ScraperEngine] Clicking search result card to resolve to Place Details...`);
        await firstPlaceCard.click().catch(() => {});
        await page.waitForTimeout(3000);
      }

      // 2. OPEN THE PHOTO GALLERY OVERLAY
      const gallerySelectors = [
        'button[jsaction*="heroHeaderImage"]',
        'button[aria-label*="Photo of"]',
        'button[jsaction*="hero.gallery"]',
        'button:has-text("See photos")',
        'button:has-text("Photos")',
        'button.aoi81d'
      ];
      
      let galleryOpened = false;
      for (const sel of gallerySelectors) {
        try {
          const btn = page.locator(sel).first();
          if (await btn.isVisible({ timeout: 1200 }).catch(() => false)) {
            console.log(`[ScraperEngine] Opening photo gallery overlay via selector: ${sel}`);
            await btn.click({ force: true }).catch(() => {});
            await page.waitForTimeout(3000);
            galleryOpened = true;
            break;
          }
        } catch {}
      }

      // 3. DETECT & RANK TABS BY BUSINESS CATEGORY
      const catLower = (category || '').toLowerCase();
      let preferredTabs: string[] = ['By owner', 'Latest', 'All'];

      if (catLower.includes('restaurant') || catLower.includes('food') || catLower.includes('diner') || 
          catLower.includes('bistro') || catLower.includes('grill') || catLower.includes('pizza') || 
          catLower.includes('sushi') || catLower.includes('steakhouse') || catLower.includes('dining') ||
          catLower.includes('bbq') || catLower.includes('biryani') || catLower.includes('kitchen')) {
        preferredTabs = ['Food & drink', 'Food', 'Dishes', 'By owner', 'Menu', 'Latest', 'All', 'طعام', 'القائمة'];
      } else if (catLower.includes('cafe') || catLower.includes('coffee') || catLower.includes('bake') || 
                 catLower.includes('tea') || catLower.includes('patisserie') || catLower.includes('bakery') ||
                 catLower.includes('donut') || catLower.includes('dessert') || catLower.includes('ice cream')) {
        preferredTabs = ['Food & drink', 'Food', 'By owner', 'Menu', 'Latest', 'All', 'طعام', 'القائمة'];
      } else if (catLower.includes('cloth') || catLower.includes('boutique') || catLower.includes('store') || 
                 catLower.includes('shop') || catLower.includes('retail') || catLower.includes('fashion') ||
                 catLower.includes('wear') || catLower.includes('jewel') || catLower.includes('saree') ||
                 catLower.includes('textile') || catLower.includes('garment') || catLower.includes('apparel') ||
                 catLower.includes('mall') || catLower.includes('outlet') || catLower.includes('brand')) {
        preferredTabs = [
          'Dress', 'Dresses', 'Clothing', 'Clothes', 'Products', 'Product',
          'Apparel', 'Outfit', 'Outfits', 'Fashion', 'Collection', 'Catalogue',
          'Jewellery', 'Jewelry', 'Saree', 'Sarees', 'Shoes', 'Footwear',
          'By owner', 'Inside', 'Latest', 'All', 'من المالك'
        ];
      } else if (catLower.includes('salon') || catLower.includes('spa') || catLower.includes('beauty') || 
                 catLower.includes('barber') || catLower.includes('nail') || catLower.includes('hair')) {
        preferredTabs = ['Services', 'By owner', 'Inside', 'Latest', 'All', 'من المالك'];
      } else if (catLower.includes('gym') || catLower.includes('fitness') || catLower.includes('yoga') || 
                 catLower.includes('sport') || catLower.includes('crossfit')) {
        preferredTabs = ['Inside', 'By owner', 'Latest', 'All', 'من المالك'];
      } else if (catLower.includes('hotel') || catLower.includes('resort') || catLower.includes('lodge') || 
                 catLower.includes('hostel') || catLower.includes('motel')) {
        preferredTabs = ['Rooms'];
      }

      // 3. MULTI-SECTION ALL-TAB SCRAPER LOOP
      // Scrapes photos across ALL visible gallery sections/tabs (e.g. Products, Dress, Food, Inside, By owner, All, Latest)
      const allExtractedPhotos: string[] = [];
      const seenPhotoBases = new Set<string>();

      const extractPhotosFromCurrentView = async (): Promise<string[]> => {
        return await page.evaluate(() => {
          const extracted: string[] = [];
          const seen = new Set();
          const allEls = Array.from(document.querySelectorAll('img, button, div, a, span'));
          
          for (let i = 0; i < allEls.length; i++) {
            const el = allEls[i];
            let raw = '';
            if (el.tagName === 'IMG') {
              const img = el as HTMLImageElement;
              raw = img.src || img.getAttribute('src') || img.getAttribute('data-src') || '';
            }
            if (!raw) {
              const style = el.getAttribute('style') || '';
              if (style.includes('background-image')) {
                const match = style.match(/url\(['"]?(.*?)['"]?\)/);
                if (match && match[1]) raw = match[1];
              }
            }
            if (raw && (raw.includes('googleusercontent.com') || raw.includes('ggpht.com')) && !raw.includes('streetview') && !raw.includes('/a-/')) {
              if (!raw.startsWith('http')) raw = 'https:' + raw;
              let highRes = raw.replace(/=w\d+(-h\d+)?(-[a-z0-9-]+)*/i, '=w1200').replace(/=s\d+(-[a-z0-9-]+)*/i, '=w1200');
              const baseKey = highRes.split('=')[0];
              if (!seen.has(baseKey)) {
                seen.add(baseKey);
                extracted.push(highRes);
              }
            }
          }
          return extracted;
        });
      };

      // Extract initial photos right away
      const initialPhotos = await extractPhotosFromCurrentView();
      for (const p of initialPhotos) {
        const baseKey = p.split('=')[0];
        if (!seenPhotoBases.has(baseKey)) {
          seenPhotoBases.add(baseKey);
          allExtractedPhotos.push(p);
        }
      }

      // Discover all available gallery section tabs on Google Maps
      const availableTabs = await page.evaluate(() => {
        const tabs: { name: string; index: number }[] = [];
        const genericIgnore = ['videos', 'street view', '360', '360°', 'share', 'saved', 'recents', 'rating', 'hours', 'back to top', 'sign in'];
        
        // Scope to gallery header container or tab list
        const tabContainer = document.querySelector('div[role="tablist"], div.DkBLWb, div.m6QErb') || document.body;
        const elements = Array.from(tabContainer.querySelectorAll('button[role="tab"], div[role="tab"], button'));
        elements.forEach((el, idx) => {
          const txt = (el.textContent || '').trim();
          if (txt && txt.length > 1 && txt.length < 25 && !genericIgnore.includes(txt.toLowerCase())) {
            if (!tabs.some(t => t.name.toLowerCase() === txt.toLowerCase())) {
              tabs.push({ name: txt, index: idx });
            }
          }
        });
        return tabs;
      });

      console.log(`[ScraperEngine] Found ${availableTabs.length} gallery sections/tabs for ${name}:`, availableTabs.map(t => t.name));

      // Prioritize tabs: category tabs first (Dress, Products, Food & drink, Services, Inside, By owner, All, Latest)
      const tabPriorityOrder = [...preferredTabs, 'Inside', 'By owner', 'Latest', 'All'];
      const sortedTabsToClick = availableTabs.sort((a, b) => {
        const indexA = tabPriorityOrder.findIndex(p => p.toLowerCase() === a.name.toLowerCase());
        const indexB = tabPriorityOrder.findIndex(p => p.toLowerCase() === b.name.toLowerCase());
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
      });

      // Iterate through up to 5 top sections to aggregate photos across ALL sections!
      for (const tabObj of sortedTabsToClick.slice(0, 5)) {
        try {
          const clicked = await page.evaluate((tabName: string) => {
            const elements = Array.from(document.querySelectorAll('button, div[role="tab"], button[role="tab"], span, a'));
            const target = elements.find(el => {
              const txt = (el.textContent || '').trim().toLowerCase();
              return txt === tabName.toLowerCase() || txt.startsWith(tabName.toLowerCase());
            });
            if (target) {
              (target as HTMLElement).click();
              return true;
            }
            return false;
          }, tabObj.name);

          if (clicked) {
            console.log(`[ScraperEngine] Scanning gallery section/tab: "${tabObj.name}"`);
            await page.waitForTimeout(2000);
            
            // Scroll inside tab view to trigger lazy-loaded images
            for (let i = 0; i < 6; i++) {
              await page.evaluate(() => {
                const containers = Array.from(document.querySelectorAll('div[role="main"], div.m6QErb, div[tabindex="-1"]'));
                const scrollable = containers.find(c => c.scrollHeight > c.clientHeight) || containers[0];
                if (scrollable) scrollable.scrollTop += 1200;
                else window.scrollBy(0, 1200);
              }).catch(() => {});
              await page.waitForTimeout(350);
            }

            const currentPhotos = await extractPhotosFromCurrentView();
            for (const photo of currentPhotos) {
              const baseKey = photo.split('=')[0];
              if (!seenPhotoBases.has(baseKey)) {
                seenPhotoBases.add(baseKey);
                allExtractedPhotos.push(photo);
              }
            }
          }
        } catch (e) {}
      }

      console.log(`[ScraperEngine] Successfully extracted total ${allExtractedPhotos.length} high-res photos across ALL sections for ${name}`);

      return allExtractedPhotos.slice(0, 18);
    } catch (e: any) {
      console.error(`[ScraperEngine] Failed to fetch photos for ${name}:`, e.message);
      return [];
    } finally {
      if (page) await page.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }
  }
}
