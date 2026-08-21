var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lib/checkpointManager.ts
var checkpointManager_exports = {};
__export(checkpointManager_exports, {
  CheckpointManager: () => CheckpointManager,
  checkpointManager: () => checkpointManager
});
var import_fs, import_path, storageDir, CheckpointManager, checkpointManager;
var init_checkpointManager = __esm({
  "lib/checkpointManager.ts"() {
    import_fs = __toESM(require("fs"), 1);
    import_path = __toESM(require("path"), 1);
    storageDir = import_path.default.join(process.cwd(), "lib", "scraper_jobs");
    CheckpointManager = class {
      constructor() {
        if (!import_fs.default.existsSync(storageDir)) {
          import_fs.default.mkdirSync(storageDir, { recursive: true });
        }
      }
      getFilePath(id) {
        return import_path.default.join(storageDir, `${id}.json`);
      }
      saveCheckpoint(checkpoint) {
        checkpoint.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        import_fs.default.writeFileSync(this.getFilePath(checkpoint.id), JSON.stringify(checkpoint, null, 2), "utf-8");
      }
      getCheckpoint(id) {
        const filePath = this.getFilePath(id);
        if (!import_fs.default.existsSync(filePath)) {
          return null;
        }
        const data = import_fs.default.readFileSync(filePath, "utf-8");
        return JSON.parse(data);
      }
      updateProgress(id, updates) {
        const checkpoint = this.getCheckpoint(id);
        if (checkpoint) {
          Object.assign(checkpoint, updates);
          this.saveCheckpoint(checkpoint);
        }
      }
    };
    checkpointManager = new CheckpointManager();
  }
});

// lib/ScraperEngine.ts
var ScraperEngine_exports = {};
__export(ScraperEngine_exports, {
  ScraperEngine: () => ScraperEngine
});
module.exports = __toCommonJS(ScraperEngine_exports);
var import_playwright = require("playwright");
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
function extractActualWebsite(url) {
  if (!url) return null;
  const clean = url.trim();
  try {
    const urlWithProto = clean.includes("://") ? clean : `https://${clean}`;
    const parsed = new URL(urlWithProto);
    if (parsed.hostname.includes("google.") && (parsed.pathname === "/url" || parsed.pathname.endsWith("/url"))) {
      const actualUrl = parsed.searchParams.get("q") || parsed.searchParams.get("url");
      if (actualUrl) {
        return actualUrl;
      }
    }
  } catch {
  }
  return clean;
}
var PageStateHarvester = class {
  static extractFromText(text, businessName) {
    const escapedName = businessName.replace(/"/g, '\\"');
    let nameIndex = text.indexOf(`"${escapedName}"`);
    if (nameIndex === -1) {
      nameIndex = text.toLowerCase().indexOf(businessName.toLowerCase());
    }
    if (nameIndex === -1) return {};
    const chunk = text.substring(nameIndex, nameIndex + 4e3);
    let phone = null;
    let website = null;
    const telMatches = [...chunk.matchAll(/"tel:([^"]+)"/g)];
    if (telMatches.length > 0) {
      phone = telMatches[0][1].trim();
    }
    if (!phone) {
      const phoneMeta = chunk.match(/itemprop="telephone"\s+content="([^"]+)"/) || chunk.match(/"telephone"\s*:\s*"([^"]+)"/);
      if (phoneMeta && phoneMeta[1]) phone = phoneMeta[1].trim();
    }
    if (!phone) {
      const phoneMatches = [...chunk.matchAll(/"(\+?[0-9][0-9\s\-\(\)]{8,20})"/g)];
      for (const m of phoneMatches) {
        const num = m[1].trim();
        const digitCount = (num.match(/\d/g) || []).length;
        if (digitCount >= 8 && digitCount <= 15 && !num.startsWith("0000") && !num.includes("1970") && !num.includes("2026")) {
          phone = num;
          break;
        }
      }
    }
    const webMatches = [...chunk.matchAll(/(?:itemprop="url"|href)="(https?:\/\/[^"]+)"/g)].concat(
      [...chunk.matchAll(/"(https?:\/\/[^"]+)"/g)]
    );
    for (const m of webMatches) {
      const url = m[1];
      if (url.startsWith("http") && !url.includes("google.com") && !url.includes("gstatic.com") && !url.includes("schema.org") && !url.includes("w3.org") && !url.includes("youtube.com")) {
        if (!url.includes("facebook.com") && !url.includes("instagram.com") && !url.includes("linkedin.com") && !url.includes("twitter.com") && !url.includes("x.com")) {
          website = url;
          break;
        }
      }
    }
    if (!website) {
      for (const m of webMatches) {
        const url = m[1];
        if (url.startsWith("http") && !url.includes("google.com") && !url.includes("gstatic.com") && !url.includes("schema.org") && !url.includes("w3.org")) {
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
};
var ScraperEngine = class {
  constructor() {
    this.browser = null;
    this.logs = [];
  }
  getLogs() {
    return this.logs;
  }
  log(message) {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    const entry = `[${ts}] ${message}`;
    console.log(entry);
    this.logs.push(entry);
  }
  async init() {
    this.log("Initializing Playwright Browser...");
    this.browser = await import_playwright.chromium.launch({
      headless: false,
      // Set to false so you can see it open
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
  }
  async close() {
    if (this.browser) {
      this.log("Closing Playwright Browser...");
      await this.browser.close();
      this.browser = null;
    }
  }
  /**
   * Scrapes leads for a given search query (e.g. "Cafe in Mumbai")
   * utilizing Scrolling and DOM extraction. 
   */
  async scrapeCity(searchQuery, city, category, jobId) {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call init() first.");
    }
    const page = await this.browser.newPage();
    const extractedLeads = [];
    const seenUrls = /* @__PURE__ */ new Set();
    const screenshotsDir = import_path2.default.join(process.cwd(), "public", "screenshots");
    if (!import_fs2.default.existsSync(screenshotsDir)) {
      import_fs2.default.mkdirSync(screenshotsDir, { recursive: true });
    }
    const interceptedPayloads = [];
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/search") || url.includes("/batchexecute") || url.includes("/maps/preview/entity")) {
        try {
          const text = await response.text();
          interceptedPayloads.push(text);
        } catch (e) {
        }
      }
    });
    try {
      this.log(`Navigating to Google Maps directly with search query...`);
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}?hl=en&gl=us`;
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 6e4 });
      const currentUrl = page.url();
      if (!currentUrl.includes("google.com/maps")) {
        this.log(`URL validation failed. Current URL: ${currentUrl}`);
        throw new Error("Failed to load Google Maps.");
      }
      this.log(`Google Maps loaded successfully. URL: ${currentUrl}`);
      try {
        const consentBtn = page.locator('button:has-text("Accept all"), button:has-text("I agree")').first();
        if (await consentBtn.isVisible({ timeout: 3e3 })) {
          await consentBtn.click();
          await page.waitForTimeout(1e3);
        }
      } catch (e) {
      }
      this.log(`Waiting for results panel...`);
      try {
        await page.waitForSelector('a[href*="/maps/place/"]', { timeout: 2e4 });
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
            const href = await card.getAttribute("href");
            if (href && !seenUrls.has(href)) {
              seenUrls.add(href);
              const cardData = await card.evaluate((el) => {
                const getContainer = (node) => node.closest("div.Nv2y1d, div.Uaht4b, div.lI9IFe, div.bfdHYd, div.THOPZb, div.rllt__details, div[jscontroller], div[data-result-index], li") || node.parentElement;
                const container = getContainer(el);
                if (!container) return null;
                const titleEl = container.querySelector(".qBF1Pd, div.fontHeadlineSmall");
                const businessName = titleEl?.textContent?.trim() || el.getAttribute("aria-label")?.trim() || "";
                const textContent = container.textContent || "";
                const ratingMatch = textContent.match(/(\d\.\d)\s*stars?/i) || textContent.match(/(\d\.\d)\(/);
                const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
                const reviewsMatch = textContent.match(/\(([\d,]+)\)/);
                const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1].replace(/,/g, "")) : 0;
                let website = "";
                const websiteEl = container.querySelector('a[data-item-id="authority"]');
                if (websiteEl && websiteEl.href) website = websiteEl.href;
                else {
                  const parent = container.parentElement || container;
                  const allLinks = Array.from(parent.querySelectorAll("a"));
                  for (const link of allLinks) {
                    if (link.href && !link.href.includes("google.") && !link.href.startsWith("javascript:")) {
                      website = link.href;
                      break;
                    }
                  }
                }
                let address = "";
                const addressIndicators = /\b(rd|road|st|street|nagar|society|plot|shop|floor|block|sector|phase|market|chowk|lane|gali|near|opp|behind|beside|next|above|below|marg|path|circle|square|colony|park|garden|enclave|vihar|puram|abad|pura|wadi|falia|chawk|main|cross|layout|extension|complex|tower|building|bldg|arcade|plaza|mall|center|centre|industrial|estate|area|zone|no\.|g-|ug-)\b/i;
                const lines = textContent.split(/[·⋅\n]/).map((s) => s.trim()).filter(Boolean);
                for (const line of lines) {
                  if (addressIndicators.test(line) && !line.includes("stars") && !/^[0-9.]+(?:\s*\([0-9,]+\))?$/.test(line)) {
                    address = line;
                    break;
                  }
                }
                let phone = "";
                const phoneMatch = textContent.match(/\+?\d[\d\s\-\(\)]{8,18}\d/);
                if (phoneMatch) phone = phoneMatch[0].trim();
                let thumbnailPhoto = "";
                const imgEls = Array.from(container.querySelectorAll("img"));
                for (const img of imgEls) {
                  const src = img.src || img.getAttribute("src") || "";
                  if (src && (src.includes("googleusercontent.com") || src.includes("ggpht.com")) && !src.includes("=s")) {
                    thumbnailPhoto = src;
                    break;
                  }
                  if (src && src.startsWith("http") && !src.includes("google.com/maps") && !src.includes("gstatic.com") && img.width > 50) {
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
                name: cardData.name.split("\xB7")[0].trim(),
                category,
                location: city,
                mapsUrl: href,
                rating: cardData.rating,
                reviewsCount: cardData.reviewsCount,
                source: "playwright_deep",
                website: actualWebsite,
                address: cardData.address,
                phone: cardData.phone,
                coordinates: lat && lng ? { lat, lng } : null,
                photos: cardData.thumbnailPhoto ? [cardData.thumbnailPhoto] : []
              });
            }
          } catch (e) {
            this.log(`Error extracting card ${i}: ${e.message}`);
          }
        }
        lastCount = currentCount;
        try {
          const feed = page.locator('div[role="feed"]').first();
          await feed.evaluate((el) => el.scrollTo(0, el.scrollHeight));
          await page.waitForTimeout(1500);
        } catch (e) {
          await page.mouse.wheel(0, 5e3);
          await page.waitForTimeout(1500);
        }
        const newCount = await page.locator('a[href*="/maps/place/"]').count();
        if (newCount === lastCount) {
          retries++;
          const endTextVisible = await page.locator(`text="You've reached the end of the list."`).isVisible().catch(() => false);
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
        const cpModule = (init_checkpointManager(), __toCommonJS(checkpointManager_exports));
        CheckpointManagerClass = cpModule.checkpointManager;
      } catch (e) {
      }
      for (let i = 0; i < extractedLeads.length; i++) {
        let lead = extractedLeads[i];
        if (jobId && CheckpointManagerClass) {
          const cp = CheckpointManagerClass.getCheckpoint(jobId);
          if (cp && cp.status === "stopped") {
            this.log(`Job ${jobId} was stopped by user.`);
            break;
          }
        }
        if (lead.phone && lead.website && lead.photos && lead.photos.length >= 3) continue;
        try {
          const card = page.locator(`a[href="${lead.mapsUrl}"]`).first();
          if (!await card.isVisible().catch(() => false)) {
            await card.scrollIntoViewIfNeeded().catch(() => {
            });
          }
          await card.click({ force: true });
          try {
            await page.waitForSelector('button[data-item-id*="phone:tel:"], a[data-item-id="authority"]', { timeout: 8e3 });
          } catch (e) {
            await page.waitForTimeout(2e3);
          }
          const detailData = await page.evaluate(() => {
            let detailPhone = "";
            const phoneBtn = document.querySelector('button[data-item-id*="phone:tel:"]');
            if (phoneBtn) {
              const match = (phoneBtn.getAttribute("data-item-id") || "").match(/phone:tel:(.+)/);
              if (match) detailPhone = match[1].trim();
            }
            let detailWebsite = "";
            const webEl = document.querySelector('a[data-item-id="authority"]');
            if (webEl && webEl.href) detailWebsite = webEl.href;
            let detailAddress = "";
            const addrBtn = document.querySelector('button[data-item-id="address"]');
            if (addrBtn) {
              const label = addrBtn.getAttribute("aria-label") || "";
              detailAddress = label.replace(/^Address:\s*/i, "").trim() || addrBtn.textContent?.trim() || "";
            }
            const detailPhotos = [];
            const seenPhotos = /* @__PURE__ */ new Set();
            const allImgs = document.querySelectorAll("img");
            for (const img of allImgs) {
              const src = img.src || "";
              if (src && (src.includes("googleusercontent.com") || src.includes("ggpht.com"))) {
                if (img.width >= 80 || img.height >= 80 || src.includes("=w") || src.includes("=s")) {
                  let photoUrl = src;
                  photoUrl = photoUrl.replace(/=w\d+(-h\d+)?(-[a-z]+)*/, "=w800");
                  photoUrl = photoUrl.replace(/=s\d+(-[a-z]+)*/, "=s800");
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
          if (detailData.detailPhotos && detailData.detailPhotos.length > 0) {
            const existingPhotos = lead.photos || [];
            const mergedSet = /* @__PURE__ */ new Set([...existingPhotos, ...detailData.detailPhotos]);
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
            this.log(`[Enrichment] Resolved ${lead.name} -> Phone: ${lead.phone || "N/A"}, Website: ${lead.website || "N/A"}`);
          }
          const backBtn = page.locator('button[jsaction*="pane.header.back"], button[aria-label="Back"], button[aria-label*="Back to"]').first();
          if (await backBtn.isVisible().catch(() => false)) {
            await backBtn.click();
          } else {
            await page.goBack();
          }
          await page.waitForTimeout(1e3);
        } catch (e) {
          this.log(`Skipping enrichment for ${lead.name}: ${e.message}`);
        }
      }
      this.log(`Deep Extraction complete for ${city}.`);
    } catch (error) {
      this.log(`Critical Extraction Error for ${city}: ${error.message}`);
    } finally {
      await page.close();
    }
    return extractedLeads;
  }
  async scrapeGoogleDork(query) {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call init() first.");
    }
    const page = await this.browser.newPage();
    const results = [];
    try {
      this.log(`Navigating to Google Search for query: "${query}"`);
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: "domcontentloaded", timeout: 3e4 });
      await page.waitForTimeout(1500);
      const hasCaptcha = await page.evaluate(() => {
        return document.body.innerHTML.includes("captcha") || document.body.innerHTML.includes("recaptcha") || document.body.innerHTML.includes("detecting unusual traffic");
      });
      if (hasCaptcha) {
        this.log(`Google CAPTCHA challenge detected. Falling back to DuckDuckGo HTML...`);
        await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { waitUntil: "domcontentloaded", timeout: 3e4 });
        await page.waitForTimeout(1e3);
        const ddgResults = await page.evaluate(() => {
          const items = [];
          document.querySelectorAll(".result").forEach((el) => {
            const titleEl = el.querySelector(".result__title a");
            const snippetEl = el.querySelector(".result__snippet");
            if (titleEl && snippetEl) {
              items.push({
                title: titleEl.textContent?.trim() || "",
                url: titleEl.getAttribute("href") || "",
                snippet: snippetEl.textContent?.trim() || ""
              });
            }
          });
          return items;
        });
        return ddgResults;
      }
      const googleResults = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll("div.g").forEach((el) => {
          const titleEl = el.querySelector("h3");
          const linkEl = el.querySelector("a");
          const snippetEl = el.querySelector('div[style*="-webkit-line-clamp"], .VwiC3b, .s3v9rd');
          if (titleEl && linkEl) {
            items.push({
              title: titleEl.textContent?.trim() || "",
              url: linkEl.getAttribute("href") || "",
              snippet: snippetEl ? snippetEl.textContent?.trim() || "" : ""
            });
          }
        });
        return items;
      });
      results.push(...googleResults);
      this.log(`Extracted ${results.length} results from Google search.`);
    } catch (e) {
      this.log(`Error during Google Dorking: ${e.message}`);
    } finally {
      await page.close();
    }
    const siteMatch = query.match(/site:([^\s"]+)/);
    const targetDomain = siteMatch ? siteMatch[1].split("/")[0].toLowerCase() : null;
    const decodeUrl = (url) => {
      if (url.includes("uddg=")) {
        const parts = url.split("uddg=");
        if (parts.length > 1) {
          try {
            return decodeURIComponent(parts[1].split("&")[0]);
          } catch (e) {
          }
        }
      }
      return url;
    };
    const cleanResults = results.map((r) => {
      const decodedUrl = decodeUrl(r.url);
      return {
        title: r.title,
        url: decodedUrl,
        snippet: r.snippet
      };
    }).filter((r) => {
      if (!targetDomain) return true;
      try {
        const urlWithProto = r.url.startsWith("http") || r.url.startsWith("//") ? r.url : `https://${r.url}`;
        const parsedUrl = new URL(urlWithProto.startsWith("//") ? `https:${urlWithProto}` : urlWithProto);
        const host = parsedUrl.hostname.toLowerCase();
        if (host.includes("duckduckgo.com")) {
          return false;
        }
        if (targetDomain === "x.com") {
          return host.includes("x.com") || host.includes("twitter.com");
        }
        return host.includes(targetDomain);
      } catch (e) {
        const urlLower = r.url.toLowerCase();
        if (urlLower.includes("duckduckgo.com/y.js") || urlLower.includes("duckduckgo.com/l/?")) {
          return false;
        }
        if (targetDomain === "x.com") {
          return urlLower.includes("x.com") || urlLower.includes("twitter.com");
        }
        return urlLower.includes(targetDomain);
      }
    });
    this.log(`Post-filtered results matching domain "${targetDomain || "all"}": ${cleanResults.length} / ${results.length}`);
    return cleanResults;
  }
  static async fetchPhotosForBusiness(name, location, mapsUrl) {
    let browser = null;
    let page = null;
    const photos = [];
    const seenPhotos = /* @__PURE__ */ new Set();
    try {
      browser = await import_playwright.chromium.launch({ headless: true });
      page = await browser.newPage();
      const targetUrl = mapsUrl || `https://www.google.com/maps/search/${encodeURIComponent(`${name} ${location || ""}`.trim())}`;
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 3e4 });
      await page.waitForSelector('img[src*="googleusercontent.com"], img[src*="ggpht.com"]', { timeout: 15e3 }).catch(() => {
      });
      await page.waitForTimeout(2e3);
      const detailPhotos = await page.evaluate(() => {
        const extracted = [];
        const seen = /* @__PURE__ */ new Set();
        const allImgs = document.querySelectorAll("img");
        for (const img of allImgs) {
          const src = img.src || "";
          if (src && (src.includes("googleusercontent.com") || src.includes("ggpht.com"))) {
            if (img.width >= 50 || img.height >= 50 || src.includes("=w") || src.includes("=s")) {
              let photoUrl = src.replace(/=w\d+(-h\d+)?(-[a-z]+)*/, "=w800").replace(/=s\d+(-[a-z]+)*/, "=s800");
              if (!seen.has(photoUrl)) {
                seen.add(photoUrl);
                extracted.push(photoUrl);
              }
            }
          }
          if (extracted.length >= 5) break;
        }
        return extracted;
      });
      return detailPhotos.slice(0, 5);
    } catch (e) {
      console.error(`[ScraperEngine] Failed to fetch photos for ${name}:`, e.message);
      return [];
    } finally {
      if (page) await page.close().catch(() => {
      });
      if (browser) await browser.close().catch(() => {
      });
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ScraperEngine
});
