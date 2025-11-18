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
      let puppeteer;

      // DETECT ENVIRONMENT
      if (process.env.VERCEL) {
        // --- VERCEL PRODUCTION CONFIG ---
        console.log('Launching in Vercel environment...');
        const chromium = require('chrome-aws-lambda');
        puppeteer = require('puppeteer-core');
        
        launchOptions = {
          args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath,
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        };
      } else {
        // --- LOCAL DEVELOPMENT CONFIG ---
        console.log('Launching in Local environment...');
        try {
          puppeteer = require('puppeteer');
        } catch (e) {
          throw new Error('Puppeteer not found. Please run: npm install puppeteer');
        }

        launchOptions = {
          headless: "new",
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080'
          ],
          ignoreHTTPSErrors: true,
        };
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

      // Enhanced stealth evasion techniques
      await this.page.evaluateOnNewDocument(() => {
        // 1. Pass WebDriver check
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        
        // 2. Mock Chrome object
        window.chrome = { runtime: {} };
        
        // 3. Pass Permissions check
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
        
        // 4. Mock Plugins/Languages
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

  async navigateToGoogle() {
    try {
      console.log('Navigating to Google...');
      await this.page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await humanDelay(2000, 4000);
      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      throw new Error(`Failed to navigate to Google: ${error.message}`);
    }
  }

  async searchKeyword(keyword) {
    try {
      console.log(`Searching for: ${keyword}`);
      // Try multiple selectors for the search box
      const searchSelectors = ['textarea[name="q"]', 'input[name="q"]', 'input[type="search"]'];
      let searchBox = null;
      
      for (const selector of searchSelectors) {
        if (await this.page.$(selector)) {
          searchBox = selector;
          break;
        }
      }

      if (!searchBox) throw new Error('Could not find search box on Google');

      // Human-like typing
      await humanMove(this.page, searchBox);
      await this.page.click(searchBox);
      await humanDelay(500, 1000);
      
      await this.page.type(searchBox, keyword, { delay: 100 });
      await humanDelay(500, 1000);
      
      await this.page.keyboard.press('Enter');
      await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 });
      
      return true;
    } catch (error) {
      console.error('Search error:', error);
      throw new Error(`Failed to search keyword: ${error.message}`);
    }
  }

  async findAndClickWebsite(targetUrl) {
    try {
      console.log(`Looking for website: ${targetUrl}`);
      const targetDomain = new URL(targetUrl).hostname.replace('www.', '');
      
      // Find the result index
      const searchResults = await this.page.$$eval('div.g', (results, domain) => {
        return results.map((result, index) => {
           const link = result.querySelector('a');
           if(link && link.href.includes(domain)) return { index };
           return null;
        }).filter(i => i);
      }, targetDomain);

      if (searchResults.length === 0) {
        throw new Error(`Website ${targetDomain} not found in the first page of results.`);
      }
      
      const matchIndex = searchResults[0].index;
      const links = await this.page.$$('div.g a');
      
      // Human click
      await humanMove(this.page, 'div.g'); // Move near results first
      await humanDelay(500, 1500);
      
      // Click the specific link
      await links[matchIndex].click();
      await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 });
      
      return true;
    } catch (error) {
      console.error('Find/Click error:', error);
      // We do not throw here to allow the bot to finish gracefully even if click fails
      // But you can throw if you want it to stop.
      return false; 
    }
  }

  async humanScroll() {
    console.log('Performing human scroll...');
    await randomScroll(this.page);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = StealthBrowser;
