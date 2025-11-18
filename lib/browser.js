const fs = require('fs');
const os = require('os');
const path = require('path');
const UserAgent = require('user-agents');
const { humanDelay, randomScroll, humanMove } = require('./humanizer');

// HELPER: Find Google Chrome on the computer
function resolveChromePath() {
  const platform = os.platform();
  let paths = [];

  if (platform === 'win32') {
    paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
    ];
  } else if (platform === 'darwin') {
    paths = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  } else if (platform === 'linux') {
    paths = [
      '/usr/bin/google-chrome', 
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser'
    ];
  }

  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

class StealthBrowser {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async launch() {
    try {
      let launchOptions;
      let puppeteerModule;

      // -----------------------------------------
      // SCENARIO 1: VERCEL / PRODUCTION
      // -----------------------------------------
      if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
        console.log('🚀 Launching in Vercel/Cloud Environment');
        const chromium = require('chrome-aws-lambda');
        puppeteerModule = require('puppeteer-core');

        launchOptions = {
          args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath,
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        };

        this.browser = await puppeteerModule.launch(launchOptions);
      } 
      // -----------------------------------------
      // SCENARIO 2: LOCAL DEVELOPMENT
      // -----------------------------------------
      else {
        console.log('💻 Launching in Local Environment');
        
        try {
          puppeteerModule = require('puppeteer');
        } catch (err) {
          throw new Error('Puppeteer package missing. Run "npm install" again.');
        }

        // Basic Options
        launchOptions = {
          headless: false,
          defaultViewport: null,
          ignoreHTTPSErrors: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=500,700' // Popup size
          ]
        };

        try {
          // Attempt 1: Try Standard Launch (Bundled Chromium)
          this.browser = await puppeteerModule.launch(launchOptions);
        } catch (launchError) {
          // Attempt 2: Fallback to System Google Chrome
          console.log('⚠️ Bundled browser not found. Switching to System Chrome...');
          
          const systemChrome = resolveChromePath();
          if (!systemChrome) {
            throw new Error(
              'CRITICAL: Could not find Google Chrome on your computer.\n' +
              'Please install Google Chrome or run "node node_modules/puppeteer/install.js"'
            );
          }

          console.log(`✅ Using System Chrome: ${systemChrome}`);
          launchOptions.executablePath = systemChrome;
          this.browser = await puppeteerModule.launch(launchOptions);
        }
      }

      return this.browser;

    } catch (error) {
      console.error('❌ Browser launch failed:', error.message);
      throw error;
    }
  }

  async createPage() {
    if (!this.browser) throw new Error('Browser not launched');
    
    try {
      this.page = await this.browser.newPage();
      
      const userAgent = new UserAgent({ deviceCategory: 'desktop' });
      await this.page.setUserAgent(userAgent.toString());

      // Stealth Scripts
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
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
    try {
      await this.page.waitForSelector(selector, { timeout: 10000 });
      await this.page.type(selector, keyword, { delay: 100 });
      await this.page.keyboard.press('Enter');
      await this.page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    } catch (e) {
      throw new Error('Search box not found or navigation failed');
    }
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
