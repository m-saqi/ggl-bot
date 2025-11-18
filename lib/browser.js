const UserAgent = require('user-agents');
const { humanDelay, randomScroll, humanMove } = require('./humanizer');

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
      // SCENARIO 1: VERCEL / PRODUCTION (Serverless)
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
      } 
      // -----------------------------------------
      // SCENARIO 2: LOCAL DEVELOPMENT (Your Computer)
      // -----------------------------------------
      else {
        console.log('💻 Launching in Local Environment');
        
        try {
          // We try to require the full puppeteer package
          puppeteerModule = require('puppeteer');
        } catch (err) {
          // This error means the package is missing from node_modules
          throw new Error('Puppeteer package is missing. Please run "npm install" again.');
        }

        launchOptions = {
          // Visible window for debugging
          headless: false,
          // Do NOT set executablePath here - let Puppeteer find the bundled Chromium
          defaultViewport: null,
          ignoreHTTPSErrors: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--start-maximized',
            '--window-size=500,700'
          ]
        };
      }

      // Launch the browser
      this.browser = await puppeteerModule.launch(launchOptions);
      return this.browser;

    } catch (error) {
      console.error('❌ Browser launch failed:', error);
      
      // Specific handling for the binary missing error
      if (error.message.includes('Could not find expected browser') || error.message.includes('revision')) {
        throw new Error(
          'BROWSER BINARY MISSING.\n' +
          'The "puppeteer" package exists, but the Chromium browser was not downloaded.\n' +
          'FIX: Run "npm install" to trigger the download.'
        );
      }
      throw error;
    }
  }

  async createPage() {
    if (!this.browser) throw new Error('Browser not launched');
    
    try {
      this.page = await this.browser.newPage();
      
      const userAgent = new UserAgent({ deviceCategory: 'desktop' });
      await this.page.setUserAgent(userAgent.toString());

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
