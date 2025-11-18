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
      const executablePath = await chromium.executablePath || 
        '/usr/bin/google-chrome-stable'; // Fallback for local dev
      
      const browserArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=site-per-process',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-translate',
        '--disable-default-apps',
        '--window-size=1920,1080',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ];

      this.browser = await puppeteer.launch({
        executablePath,
        args: browserArgs,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });

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
        // Remove webdriver property
        delete navigator.__proto__.webdriver;

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );

        // Mock chrome
        window.chrome = {
          runtime: {},
          loadTimes: () => {},
          csi: () => {},
          app: {},
          webstore: {}
        };

        // Add languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en', 'es']
        });

        // Add plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5]
        });
      });

      await this.page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      });

      // Block unnecessary resources for speed
      await this.page.setRequestInterception(true);
      this.page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      return this.page;
    } catch (error) {
      console.error('Page creation error:', error);
      throw new Error(`Failed to create page: ${error.message}`);
    }
  }

  async navigateToGoogle() {
    try {
      await this.page.goto('https://www.google.com', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      
      await humanDelay(2000, 4000);
    } catch (error) {
      console.error('Navigation error:', error);
      throw new Error(`Failed to navigate to Google: ${error.message}`);
    }
  }

  async searchKeyword(keyword) {
    try {
      const searchSelector = 'textarea[name="q"], input[name="q"]';
      await this.page.waitForSelector(searchSelector, { timeout: 10000 });
      
      await humanMove(this.page, searchSelector);
      await this.page.click(searchSelector);
      await humanDelay(500, 1000);
      
      // Clear any existing text
      await this.page.evaluate(() => {
        const search = document.querySelector('textarea[name="q"], input[name="q"]');
        if (search) search.value = '';
      });
      
      // Type with human-like pattern
      for (let char of keyword) {
        await this.page.type(searchSelector, char, { 
          delay: Math.random() * 80 + 30 
        });
      }
      
      await humanDelay(1000, 2000);
      await this.page.keyboard.press('Enter');
      await this.page.waitForNavigation({ 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      });
      
      await humanDelay(2000, 4000);
    } catch (error) {
      console.error('Search error:', error);
      throw new Error(`Failed to search keyword: ${error.message}`);
    }
  }

  async findAndClickWebsite(targetUrl) {
    try {
      // Extract domain for flexible matching
      const targetDomain = new URL(targetUrl).hostname.replace('www.', '');
      
      const searchResults = await this.page.$$eval('div.g', (results, domain) => {
        return results.map((result, index) => {
          try {
            const link = result.querySelector('a[href]');
            if (!link) return null;
            
            const url = link.href;
            const title = link.textContent || '';
            const visible = result.offsetParent !== null;
            
            // Flexible domain matching
            const urlObj = new URL(url);
            const resultDomain = urlObj.hostname.replace('www.', '');
            
            if (resultDomain.includes(domain) || domain.includes(resultDomain)) {
              return { index, url, title, visible, element: result };
            }
          } catch (e) {
            return null;
          }
          return null;
        }).filter(item => item !== null && item.visible);
      }, targetDomain);

      if (searchResults.length === 0) {
        throw new Error(`Website ${targetUrl} not found in visible search results`);
      }

      const result = searchResults[0];
      const resultSelector = `div.g:nth-of-type(${result.index + 1}) a`;
      
      await humanMove(this.page, resultSelector);
      await humanDelay(1000, 2000);
      
      await this.page.click(resultSelector);
      await this.page.waitForNavigation({ 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      });
      
      await humanDelay(2000, 4000);
    } catch (error) {
      console.error('Website click error:', error);
      throw new Error(`Failed to click website: ${error.message}`);
    }
  }

  async humanScroll() {
    try {
      await randomScroll(this.page);
    } catch (error) {
      console.error('Scroll error:', error);
      // Don't throw error for scrolling, as it's non-critical
    }
  }

  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
      }
    } catch (error) {
      console.error('Browser close error:', error);
    }
  }
}

module.exports = StealthBrowser;
