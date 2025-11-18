const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');
const UserAgent = require('user-agents');
const { humanDelay, randomScroll, humanMove } = require('./humanizer');

// ---------------------------------------------------------
// HELPER: Auto-detect Local Google Chrome Path
// ---------------------------------------------------------
function findLocalChrome() {
  const platform = os.platform();
  let possiblePaths = [];

  if (platform === 'win32') {
    // Windows Paths
    possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
    ];
  } else if (platform === 'darwin') {
    // Mac Path
    possiblePaths = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  } else if (platform === 'linux') {
    // Linux Paths
    possiblePaths = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];
  }

  // Return the first path that actually exists
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
        headless: 'new',
        ignoreHTTPSErrors: true,
        defaultViewport: null,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security'
        ]
      };

      // -------------------------------------------------------
      // SCENARIO A: VERCEL / PRODUCTION
      // -------------------------------------------------------
      if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
        console.log('🚀 Environment: Vercel/Production');
        const chromium = require('chrome-aws-lambda');
        
        // Use chrome-aws-lambda settings
        launchOptions.executablePath = await chromium.executablePath;
        launchOptions.headless = chromium.headless;
        launchOptions.args = [...chromium.args, '--hide-scrollbars', '--disable-web-security'];
      } 
      // -------------------------------------------------------
      // SCENARIO B: LOCAL DEVELOPMENT
      // -------------------------------------------------------
      else {
        console.log('💻 Environment: Local Development');
        
        const chromePath = findLocalChrome();
        if (!chromePath) {
          throw new Error(
            '❌ Google Chrome not found on this computer.\n' +
            'Please install Google Chrome to run the bot locally.'
          );
        }

        console.log(`✅ Found Chrome at: ${chromePath}`);
        launchOptions.executablePath = chromePath;
        
        // VISIBLE MODE: Show the browser so you can see it working
        launchOptions.headless = false; 
        launchOptions.args.push('--window-size=500,700'); // Popup size
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
    try {
      this.page = await this.browser.newPage();
      const userAgent = new UserAgent({ deviceCategory: 'desktop' });
      await this.page.setUserAgent(userAgent.toString());

      // Stealth Scripts to hide automation
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
        window.navigator.permissions.query = (p) => 
          p.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : window.navigator.permissions.query(p);
      });

      return this.page;
    } catch (error) {
      throw new Error(`Failed to create page: ${error.message}`);
    }
  }

  async navigateToGoogle() {
    await this.page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });
    await humanDelay(1000, 2000);
  }

  async searchKeyword(keyword) {
    const selector = 'textarea[name="q"], input[name="q"]';
    await this.page.waitForSelector(selector, { timeout: 10000 });
    await this.page.type(selector, keyword, { delay: 100 });
    await this.page.keyboard.press('Enter');
    await this.page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  }

  async findAndClickWebsite(targetUrl) {
    const domain = new URL(targetUrl).hostname.replace('www.', '');
    const linkFound = await this.page.evaluate((domain) => {
      const links = Array.from(document.querySelectorAll('div.g a'));
      const target = links.find(l => l.href.includes(domain));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.click();
        return true;
      }
      return false;
    }, domain);

    if (!linkFound) throw new Error(`Website ${domain} not found in results`);
    await humanDelay(2000, 4000);
  }

  async humanScroll() {
    await randomScroll(this.page);
  }

  async close() {
    if (this.browser) await this.browser.close();
  }
}

module.exports = StealthBrowser;
