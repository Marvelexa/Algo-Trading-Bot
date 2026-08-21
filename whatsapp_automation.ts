import { chromium, BrowserContext } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const SESSION_DIR = path.join(process.cwd(), ".whatsapp_session");
const SENT_LOG_PATH = path.join(process.cwd(), "public", "whatsapp_sent_log.json");

// Load the local sent log database
function getSentLog(): string[] {
  try {
    if (fs.existsSync(SENT_LOG_PATH)) {
      const data = fs.readFileSync(SENT_LOG_PATH, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("[WhatsApp Sent Log] Error reading log file:", error);
  }
  return [];
}

// Add a number to the local sent log database
function addToSentLog(phone: string) {
  try {
    const log = getSentLog();
    if (!log.includes(phone)) {
      log.push(phone);
      // Ensure directory exists
      const dir = path.dirname(SENT_LOG_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(SENT_LOG_PATH, JSON.stringify(log, null, 2), "utf8");
      console.log(`[WhatsApp Sent Log] Logged phone number: ${phone}`);
    }
  } catch (error) {
    console.error("[WhatsApp Sent Log] Error writing log file:", error);
  }
}

export interface SendResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
}

function getBravePath(): string | undefined {
  const paths = [
    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    path.join(process.env.LOCALAPPDATA || "", "BraveSoftware\\Brave-Browser\\Application\\brave.exe")
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

export async function sendWhatsAppMessage(
  phone: string, 
  message: string, 
  forceLogin: boolean = false, 
  videoPath?: string, 
  skipDuplicateCheck: boolean = false,
  autoSend: boolean = true
): Promise<SendResult> {
  let cleanPhone = phone.replace(/[^0-9]/g, ""); // strip + or spaces
  if (!cleanPhone) {
    return { success: false, reason: "Invalid phone number format" };
  }

  // Strip international dialing double zero prefix if it starts with 0091
  if (cleanPhone.startsWith("0091")) {
    cleanPhone = cleanPhone.substring(2);
  }
  
  // Format Indian numbers starting with '910' (e.g. +91 09876543210 -> 9109876543210 -> 919876543210)
  if (cleanPhone.startsWith("910") && cleanPhone.length === 13) {
    cleanPhone = "91" + cleanPhone.substring(3);
  } else if (cleanPhone.startsWith("0") && cleanPhone.length === 11) {
    // Format Indian numbers starting with '0' (e.g. 09876543210 -> 919876543210)
    cleanPhone = "91" + cleanPhone.substring(1);
  } else if (cleanPhone.length === 10) {
    // Format Indian numbers without prefix (e.g. 9876543210 -> 919876543210)
    cleanPhone = "91" + cleanPhone;
  }

  // 1. Check local Sent Log database first to avoid launching browser unnecessarily
  if (!skipDuplicateCheck) {
    const sentLog = getSentLog();
    if (sentLog.includes(cleanPhone)) {
      console.log(`[WhatsApp] Skip: Phone number ${cleanPhone} already exists in local sent log.`);
      return { success: false, skipped: true, reason: "Duplicate detected in local sent log" };
    }
  }

  console.log(`[WhatsApp] Preparing to send message to ${cleanPhone}...`);

  // Ensure session directory exists
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  // Determine if we need to force headful mode for login
  const isSessionEmpty = fs.readdirSync(SESSION_DIR).length === 0;
  const useHeadful = forceLogin || isSessionEmpty || !autoSend; // Force headful if auto-send is disabled so user can manually view/send

  if (useHeadful) {
    console.log("[WhatsApp] Launching in HEADFUL mode...");
  } else {
    console.log("[WhatsApp] Active session found. Launching in HEADLESS mode...");
  }

  const bravePath = getBravePath();
  if (bravePath) {
    console.log(`[WhatsApp] Launching Brave browser at: ${bravePath}`);
  } else {
    console.log("[WhatsApp] Brave browser not found. Falling back to default Chromium...");
  }

  const context = await chromium.launchPersistentContext(SESSION_DIR, {
    executablePath: bravePath,
    headless: !useHeadful,
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    args: [
      "--disable-gpu", // stable for persistent context
      "--disable-dev-shm-usage",
      "--no-sandbox",
    ]
  });

  let page: any = null;
  try {
    page = await context.newPage();

    // Mask webdriver property to bypass headless detection
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    // Settle default timeout
    page.setDefaultTimeout(60000);

    // 2. Navigate to WhatsApp Web Send URL (do not append text so we type it like a human)
    const targetUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}`;
    console.log(`[WhatsApp] Navigating to send URL: ${targetUrl}`);
    await page.goto(targetUrl);

    // Check if QR code is displayed (means we are not logged in)
    const qrSelector = 'canvas, div[data-testid="qrcode"]';
    const chatListSelector = 'div[data-testid="chat-list"]';
    const composeBoxSelector = 'div[data-testid="conversation-compose-box-input"]';
    const okBtnSelector = 'button:has-text("OK")';
    const invalidSelector = 'text="Phone number shared via url is invalid"';

    // Wait to see what loads first
    console.log("[WhatsApp] Waiting for WhatsApp Web state...");
    
    // We can poll or wait for selectors
    const state = await Promise.race([
      page.waitForSelector(qrSelector, { timeout: 45000 }).then(() => "qr"),
      page.waitForSelector(composeBoxSelector, { timeout: 45000 }).then(() => "compose"),
      page.waitForSelector(okBtnSelector, { timeout: 45000 }).then(() => "invalid"),
      page.waitForSelector(invalidSelector, { timeout: 45000 }).then(() => "invalid")
    ]).catch((err) => {
      console.log("[WhatsApp] Timeout or error waiting for initial selectors:", err.message);
      return "unknown";
    });

    if (state === "unknown") {
      console.log("[WhatsApp] Failed to detect WhatsApp Web state (timeout).");
      if (page) {
        try {
          const screenshotPath = path.join(process.cwd(), "public", "whatsapp_error.png");
          await page.screenshot({ path: screenshotPath });
          console.log(`[WhatsApp Error Debug] Saved error screenshot to: ${screenshotPath}`);
        } catch (e) {}
      }
      await context.close();
      return { success: false, reason: "Timeout loading WhatsApp Web" };
    }

    if (state === "qr") {
      if (!useHeadful) {
        console.log("[WhatsApp] Detected QR code in Headless mode. Closing browser and reopening in HEADFUL mode for login...");
        await context.close();
        // Re-run with forceLogin = true
        return sendWhatsAppMessage(phone, message, true, videoPath, skipDuplicateCheck, autoSend);
      } else {
        console.log("\n==========================================================");
        console.log("👉 PLEASE SCAN THE QR CODE ON THE SCREEN WITH YOUR WHATSAPP");
        console.log("==========================================================\n");
        // Wait until logged in (chat list or compose box appears)
        await Promise.race([
          page.waitForSelector(chatListSelector, { timeout: 120000 }),
          page.waitForSelector(composeBoxSelector, { timeout: 120000 })
        ]);
        console.log("[WhatsApp] Login detected! Proceeding...");
      }
    }

    if (state === "invalid" || await page.locator(okBtnSelector).isVisible() || await page.locator(invalidSelector).isVisible()) {
      console.log(`[WhatsApp] URL navigation failed or flagged invalid. Attempting manual search fallback for ${cleanPhone}...`);
      if (await page.locator(okBtnSelector).isVisible()) {
        await page.click(okBtnSelector);
        await page.waitForTimeout(1000);
      }
      
      try {
        const searchInputSelector = 'div[data-testid="chat-list-search"], div[contenteditable="true"][data-tab="3"]';
        await page.waitForSelector(searchInputSelector, { timeout: 15000 });
        const searchInput = page.locator(searchInputSelector).first();
        await searchInput.focus();
        await searchInput.fill(cleanPhone);
        await page.waitForTimeout(3000); // Wait for search results to load
        
        // Try pressing Enter first to open the chat
        await page.keyboard.press("Enter");
        await page.waitForTimeout(2000);
        
        // Check if compose box is visible
        let composeVisible = await page.locator(composeBoxSelector).isVisible();
        if (!composeVisible) {
          // Try clicking the first listitem or cell in the search results
          const resultSelector = 'div[data-testid="search-results"] div[role="listitem"], div[data-testid="list-item-search"], div[data-testid="cell-frame-container"]';
          if (await page.locator(resultSelector).first().isVisible()) {
            await page.locator(resultSelector).first().click();
            await page.waitForTimeout(2000);
          }
        }
        
        // Verify we opened the chat
        composeVisible = await page.locator(composeBoxSelector).isVisible();
        if (!composeVisible) {
          throw new Error("Chat compose box not visible after manual search");
        }
        console.log(`[WhatsApp] Manual search fallback succeeded. Opened chat for ${cleanPhone}!`);
      } catch (searchError: any) {
        console.error(`[WhatsApp] Manual search fallback failed for ${cleanPhone}:`, searchError.message);
        await context.close();
        return { success: false, reason: `Phone number is not registered or search failed: ${searchError.message}` };
      }
    }

    // Wait for compose box to ensure page is loaded
    await page.waitForSelector(composeBoxSelector, { timeout: 30000 });
    await page.waitForTimeout(2000); // Settle time to populate text

    // 3. Double-Message Check (Live Chat History Check)
    if (!skipDuplicateCheck) {
      const msgSelector = '[data-testid="msg-container"]';
      const msgCount = await page.locator(msgSelector).count();
      console.log(`[WhatsApp] Found ${msgCount} existing message(s) in this chat.`);

      if (msgCount > 0) {
        console.log(`[WhatsApp] Chat already has history. Skipping to prevent double-texting.`);
        addToSentLog(cleanPhone); // Log it so we skip it immediately next time
        await context.close();
        return { success: false, skipped: true, reason: "Duplicate detected (chat history exists)" };
      }
    }

    // 4. Simulate human typing of message in the main compose box first
    console.log("[WhatsApp] Simulating human typing of message...");
    await page.focus(composeBoxSelector);
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    
    // Type character-by-character with randomized human typing speed delay (30ms to 70ms)
    for (const char of message) {
      await page.keyboard.insertText(char);
      await page.waitForTimeout(30 + Math.floor(Math.random() * 40));
    }
    await page.waitForTimeout(1500); // Settle after typing

    // 5. Attach video if exists, or send the text directly
    if (videoPath && fs.existsSync(videoPath)) {
      console.log(`[WhatsApp] Attaching video file from path: ${videoPath}`);
      
      const fileInputSelector = 'input[type="file"][accept*="video"], input[type="file"][accept*="image"], input[type="file"]';
      await page.setInputFiles(fileInputSelector, videoPath);
      
      console.log("[WhatsApp] Waiting for media editor preview screen...");
      const captionInputSelector = 'div[data-testid="media-editor-write-message"], div[aria-placeholder="Add a caption"], div[contenteditable="true"]';
      await page.waitForSelector(captionInputSelector, { timeout: 20000 });
      await page.waitForTimeout(1500); // Wait for preview to settle
      
      // WhatsApp Web usually moves the typed text from compose box to the caption box automatically.
      // But let's check and type it if it wasn't copied over for some reason.
      const captionText = await page.locator(captionInputSelector).innerText();
      if (!captionText || captionText.trim() === "") {
        console.log("[WhatsApp] Caption not auto-populated in preview. Copying message to caption box...");
        await page.focus(captionInputSelector);
        await page.keyboard.insertText(message);
        await page.waitForTimeout(1000);
      }
      
      if (!autoSend) {
        console.log("[WhatsApp] Auto-send is disabled. Media is attached and caption is set. Leaving browser open for manual review...");
        await Promise.race([
          new Promise((resolve) => page.on("close", resolve)),
          new Promise((resolve) => context.on("close", resolve)),
          page.waitForTimeout(300000)
        ]).catch(() => {});
        try {
          await context.close();
        } catch (e) {}
        return { success: true, reason: "Prepared manually" };
      }

      console.log("[WhatsApp] Clicking Send media button...");
      const mediaSendBtnSelector = 'span[data-icon="send"], [data-testid="send"], [data-icon="send-media"], button:has(span[data-icon="send"])';
      const mediaSendBtn = page.locator(mediaSendBtnSelector).first();
      await mediaSendBtn.click();
      
      console.log("[WhatsApp] Waiting for video upload to finalize...");
      await page.waitForTimeout(10000); 
    } else {
      if (!autoSend) {
        console.log("[WhatsApp] Auto-send is disabled. Text message is typed. Leaving browser open for manual review...");
        await Promise.race([
          new Promise((resolve) => page.on("close", resolve)),
          new Promise((resolve) => context.on("close", resolve)),
          page.waitForTimeout(300000)
        ]).catch(() => {});
        try {
          await context.close();
        } catch (e) {}
        return { success: true, reason: "Prepared manually" };
      }

      console.log("[WhatsApp] Sending text message...");
      const sendBtnSelector = 'button:has(span[data-icon="send"]), button[data-testid="compose-btn-send"], span[data-icon="send"]';
      const hasSendBtn = await page.locator(sendBtnSelector).first().isVisible();
      
      if (hasSendBtn) {
        console.log("[WhatsApp] Clicking Send button...");
        await page.locator(sendBtnSelector).first().click();
      } else {
        console.log("[WhatsApp] Send button not visible. Focus and press Enter on compose box...");
        await page.focus(composeBoxSelector);
        await page.keyboard.press("Enter");
      }
      await page.waitForTimeout(3000);
    }
    console.log(`[WhatsApp] Message successfully sent to ${cleanPhone}!`);

    // Log to Sent Database
    addToSentLog(cleanPhone);

    await context.close();
    return { success: true };

  } catch (error: any) {
    console.error("[WhatsApp] Error during WhatsApp automation:", error);
    if (page) {
      try {
        const screenshotPath = path.join(process.cwd(), "public", "whatsapp_error.png");
        await page.screenshot({ path: screenshotPath });
        console.log(`[WhatsApp Error Debug] Saved error screenshot to: ${screenshotPath}`);
      } catch (e) {}
    }
    try {
      await context.close();
    } catch (e) {}
    return { success: false, reason: error.message || "Automation failed" };
  }
}

// Support executing from CLI directly
const isMain = process.argv[1] && (
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
  process.argv[1].endsWith("whatsapp_automation.ts")
);
if (isMain) {
  const args = process.argv.slice(2);
  const loginMode = args.includes("--login");
  const phoneIndex = args.indexOf("--phone");
  const msgIndex = args.indexOf("--message");

  const phone = phoneIndex !== -1 ? args[phoneIndex + 1] : "";
  const message = msgIndex !== -1 ? args[msgIndex + 1] : "Hello from outreach automation!";

  if (loginMode) {
    console.log("[CLI] Running in Setup Login Mode...");
    sendWhatsAppMessage("910000000000", "Setup login", true)
      .then((res) => {
        console.log("[CLI] Setup complete. Result:", res);
        process.exit(0);
      })
      .catch((err) => {
        console.error("[CLI] Error:", err);
        process.exit(1);
      });
  } else if (phone) {
    console.log(`[CLI] Sending message to ${phone}...`);
    sendWhatsAppMessage(phone, message, false)
      .then((res) => {
        console.log("[CLI] Finished. Result:", res);
        process.exit(0);
      })
      .catch((err) => {
        console.error("[CLI] Error:", err);
        process.exit(1);
      });
  } else {
    console.log("Usage:");
    console.log("  Scan QR / Setup Login: npx tsx whatsapp_automation.ts --login");
    console.log("  Send Message:          npx tsx whatsapp_automation.ts --phone <number> --message <text>");
  }
}
