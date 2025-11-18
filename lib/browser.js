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
        // --- VERCEL (Must be Headless/Invisible) ---
        console.log('Launching in Vercel environment...');
        const chromium = require('chrome-aws-lambda');
        puppeteer = require('puppeteer-core');
        
        launchOptions = {
          args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath,
          headless: chromium.headless, // Always true on serverless
          ignoreHTTPSErrors: true,
        };
      } else {
        // --- LOCAL (Visible "Popup" Mode) ---
        console.log('Launching in Local environment (Visible Mode)...');
        try {
          // Ensure you ran: npm install puppeteer
          puppeteer = require('puppeteer'); 
        } catch (e) {
          throw new Error('Puppeteer not found. Please run: npm install puppeteer');
        }

        launchOptions = {
          // 'false' means the browser is VISIBLE
          headless: false, 
          
          // Sets the window size to look like a popup (width, height)
          defaultViewport: null, 
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=500,700', // <--- SIZE OF THE POPUP
            '--window-position=100,100' // Position on screen
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
      
      const userAgent = new UserAgent({ deviceCategory: 'desktop' });
      await this.page.setUserAgent(userAgent.toString());

      // Enhanced stealth evasion
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      });

      // Note: Viewport is set in launchOptions args for local mode
      
      return this.page;
    } catch (error) {
      console.error('Page creation error:', error);
      throw new Error(`Failed to create page: ${error.message}`);
    }
  }

  async navigateToGoogle() {
    try {
      console.log('Navigating to Google...');
      // Only wait for domcontentloaded to speed up visual feedback
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
      const searchSelectors = ['textarea[name="q"]', 'input[name="q"]', 'input[type="search"]'];
      let searchBox = null;
      
      for (const selector of searchSelectors) {
        if (await this.page.$(selector)) {
          searchBox = selector;
          break;
        }
      }

      if (!searchBox) throw new Error('Could not find search box on Google');

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
      
      const searchResults = await this.page.$$eval('div.g', (results, domain) => {
        return results.map((result, index) => {
           const link = result.querySelector('a');
           if(link && link.href.includes(domain)) return { index };
           return null;
        }).filter(i => i);
      }, targetDomain);

      if (searchResults.length === 0) {
        console.log(`Website ${targetDomain} not found on page 1`);
        // Optional: Scroll down to load more results?
        return false;
      }
      
      const matchIndex = searchResults[0].index;
      const links = await this.page.$$('div.g a');
      
      await humanMove(this.page, 'div.g');
      await humanDelay(500, 1500);
      
      await links[matchIndex].click();
      // Wait longer for the visual "pop" of the new site opening
      await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 });
      
      return true;
    } catch (error) {
      console.error('Find/Click error:', error);
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
