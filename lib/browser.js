const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda');
const UserAgent = require('user-agents');
const { humanDelay, randomScroll, humanMove } = require('./humanizer');

class StealthBrowser {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async launch() {
    try {
      let launchOptions = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=site-per-process',
          '--window-size=1920,1080',
        ],
        ignoreHTTPSErrors: true,
      };

      // Configuration for Vercel/AWS Lambda environment
      if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
        launchOptions = {
          args: [...chromium.args, '--disable-web-security', '--disable-features=IsolateOrigins', '--disable-site-isolation-trials'],
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath,
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        };
      } else {
        // Local development fallback
        // You must point this to your local Chrome installation or install 'puppeteer' locally
        launchOptions.executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; // Windows example
        // For Mac/Linux, adjust this path or install the full 'puppeteer' package for dev
      }

      this.browser = await puppeteer.launch(launchOptions);
      return this.browser;
    } catch (error) {
      console.error('Browser launch error:', error);
      throw new Error(`Failed to launch browser: ${error.message}`);
    }
  }

  async createPage() {
    try {
      this.page = await this.browser.newPage();
      
      // Set random user agent
      const userAgent = new UserAgent({ deviceCategory: 'desktop' });
      await this.page.setUserAgent(userAgent.toString());

      // Enhanced stealth evasion
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            window.navigator.permissions.query(parameters)
        );
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      });

      await this.page.setViewport({ width: 1920, height: 1080 });

      return this.page;
    } catch (error) {
      console.error('Page creation error:', error);
      throw new Error(`Failed to create page: ${error.message}`);
    }
  }

  // ... Keep the rest of your methods (navigateToGoogle, searchKeyword, etc.) exactly the same ...
  async navigateToGoogle() {
    try {
      await this.page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await humanDelay(2000, 4000);
      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      throw new Error(`Failed to navigate to Google: ${error.message}`);
    }
  }

  async searchKeyword(keyword) {
    try {
      const searchSelectors = ['textarea[name="q"]', 'input[name="q"]', 'input[type="search"]'];
      let searchBox = null;
      for (const selector of searchSelectors) {
        searchBox = await this.page.$(selector);
        if (searchBox) break;
      }

      if (!searchBox) throw new Error('Could not find search box on Google');

      await humanMove(this.page, 'textarea[name="q"]' || 'input[name="q"]');
      await this.page.click('textarea[name="q"]' || 'input[name="q"]');
      await humanDelay(500, 1000);
      
      await this.page.type('textarea[name="q"]' || 'input[name="q"]', keyword, { delay: 100 });
      await humanDelay(500, 1000);
      await this.page.keyboard.press('Enter');
      await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
      
      return true;
    } catch (error) {
      console.error('Search error:', error);
      throw new Error(`Failed to search keyword: ${error.message}`);
    }
  }

  async findAndClickWebsite(targetUrl) {
     // ... (Keep your existing implementation) ...
     // Note: Ensure you copy the implementation from your original file
      try {
      const targetDomain = new URL(targetUrl).hostname.replace('www.', '');
      const searchResults = await this.page.$$eval('div.g', (results, domain) => {
        return results.map((result, index) => {
           const link = result.querySelector('a');
           if(link && link.href.includes(domain)) return { index };
           return null;
        }).filter(i => i);
      }, targetDomain);

      if (searchResults.length === 0) throw new Error('Website not found in results');
      
      const links = await this.page.$$('div.g a');
      await links[searchResults[0].index].click();
      await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
      return true;
    } catch (error) {
      console.error('Click error:', error);
       // Don't throw here if you want the bot to continue even if click fails, or throw to report error
       throw error;
    }
  }

  async humanScroll() {
    await randomScroll(this.page);
  }

  async close() {
    if (this.browser) await this.browser.close();
  }
}

module.exports = StealthBrowser;
