const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');
const { humanDelay, randomScroll } = require('./humanizer');

// Add Stealth Plugin
puppeteer.use(StealthPlugin());

// ---------------------------------------------------------
// HELPER: Auto-detect Local Google Chrome Path
// ---------------------------------------------------------
function findLocalChrome() {
  const platform = os.platform();
  let possiblePaths = [];

  if (platform === 'win32') {
    possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
    ];
  } else if (platform === 'darwin') {
    possiblePaths = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  } else if (platform === 'linux') {
    possiblePaths = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];
  }

  return possiblePaths.find(p => fs.existsSync(p)) || null;
}

class StealthBrowser {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async launch() {
    try {
      let launchOptions = {
        headless: "new",
        ignoreHTTPSErrors: true,
        defaultViewport: { width: 1366, height: 768 },
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      };

      // -------------------------------------------------------
      // SCENARIO A: VERCEL / PRODUCTION
      // -------------------------------------------------------
      if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
        console.log('🚀 Environment: Vercel/Production');
        const chromium = require('@sparticuz/chromium');
        
        // Helper to load local font if needed (optional for Vercel)
        // await chromium.font('https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf');

        launchOptions.executablePath = await chromium.executablePath();
        launchOptions.headless = chromium.headless;
        launchOptions.args = [...launchOptions.args, ...chromium.args];
      } 
      // -------------------------------------------------------
      // SCENARIO B: LOCAL DEVELOPMENT
      // -------------------------------------------------------
      else {
        console.log('💻 Environment: Local Development');
        const chromePath = findLocalChrome();
        
        if (chromePath) {
          console.log(`✅ Found Chrome at: ${chromePath}`);
          launchOptions.executablePath = chromePath;
          launchOptions.headless = false; // Visible locally
        } else {
          // Fallback to puppeteer's bundled chromium if local chrome not found
          console.log('⚠️ Local Chrome not found, using Puppeteer bundled version');
        }
      }

      this.browser = await puppeteer.launch(launchOptions);
      return this.browser;

    } catch (error) {
      console.error('❌ Fatal Error launching browser:', error.message);
      throw error;
    }
  }

  async createPage() {
    if (!this.browser) throw new Error('Browser not launched');
    this.page = await this.browser.newPage();
    
    // randomize user agent
    const userAgent = new UserAgent({ deviceCategory: 'desktop' });
    await this.page.setUserAgent(userAgent.toString());

    return this.page;
  }

  async navigateToGoogle() {
    // Go to Google and wait for the search box
    await this.page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    
    // Handle "Accept Cookies" popup if it appears (Europe/Global)
    try {
        const buttons = await this.page.$x("//button[contains(., 'Accept all')]");
        if (buttons.length > 0) {
            await buttons[0].click();
            await humanDelay(500, 1000);
        }
    } catch (e) {
        // Ignore if no cookie banner
    }
  }

  async searchKeyword(keyword) {
    const selector = 'textarea[name="q"], input[name="q"]';
    await this.page.waitForSelector(selector, { timeout: 15000 });
    
    // Human-like typing
    await this.page.type(selector, keyword, { delay: Math.floor(Math.random() * 100) + 50 });
    await humanDelay(500, 1000);
    await this.page.keyboard.press('Enter');
    await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
  }

  async findAndClickWebsite(targetUrl) {
    const domain = new URL(targetUrl).hostname.replace('www.', '');
    let found = false;
    let pageNum = 1;
    const maxPages = 5; // How many pages of Google results to check

    while (!found && pageNum <= maxPages) {
        console.log(`🔍 Searching for ${domain} on Google Page ${pageNum}...`);
        
        // Search all links in search results
        found = await this.page.evaluate((domainSearch) => {
            const links = Array.from(document.querySelectorAll('div.g a'));
            const target = links.find(l => l.href && l.href.includes(domainSearch));
            
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return true; 
            }
            return false;
        }, domain);

        if (found) {
            // We found it, now click it properly
            // We select it again to click it from Node context to avoid sandboxing issues
            const links = await this.page.$$('div.g a');
            for (const link of links) {
                const href = await this.page.evaluate(el => el.href, link);
                if (href.includes(domain)) {
                    await link.click();
                    await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 });
                    return;
                }
            }
        } else {
            // Not found on this page, try to go to next page
            console.log(`❌ Not found on page ${pageNum}. Checking next page...`);
            const nextButton = await this.page.$('#pnnext');
            if (nextButton) {
                await nextButton.click();
                await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
                await humanDelay(2000, 3000);
                pageNum++;
            } else {
                throw new Error(`Website ${domain} not found (End of results reached)`);
            }
        }
    }

    if (!found) throw new Error(`Website ${domain} not found in first ${maxPages} pages`);
  }

  async humanScroll() {
    await randomScroll(this.page);
  }

  async close() {
    if (this.browser) await this.browser.close();
  }
}

module.exports = StealthBrowser;
