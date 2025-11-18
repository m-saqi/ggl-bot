const puppeteer = require('puppeteer');
const UserAgent = require('user-agents');
const { humanDelay, randomScroll, humanMove } = require('./humanizer');

class StealthBrowser {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async launch() {
    try {
      const launchOptions = {
        headless: 'new',
        args: [
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
        ],
        ignoreHTTPSErrors: true,
      };

      // Use system Chrome on Vercel
      if (process.env.VERCEL) {
        launchOptions.executablePath = '/usr/bin/google-chrome-stable';
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
        // Remove webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

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
      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      throw new Error(`Failed to navigate to Google: ${error.message}`);
    }
  }

  async searchKeyword(keyword) {
    try {
      // Try multiple possible selectors
      const searchSelectors = [
        'textarea[name="q"]',
        'input[name="q"]',
        'textarea[title="Search"]',
        'input[title="Search"]',
        'textarea',
        'input[type="search"]'
      ];

      let searchBox = null;
      for (const selector of searchSelectors) {
        searchBox = await this.page.$(selector);
        if (searchBox) break;
      }

      if (!searchBox) {
        throw new Error('Could not find search box on Google');
      }

      await humanMove(this.page, searchSelectors[0]);
      await this.page.click(searchSelectors[0]);
      await humanDelay(500, 1000);
      
      // Clear any existing text
      await this.page.evaluate((selector) => {
        const search = document.querySelector(selector);
        if (search) search.value = '';
      }, searchSelectors[0]);
      
      // Type with human-like pattern
      for (let char of keyword) {
        await this.page.type(searchSelectors[0], char, { 
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
      return true;
    } catch (error) {
      console.error('Search error:', error);
      throw new Error(`Failed to search keyword: ${error.message}`);
    }
  }

  async findAndClickWebsite(targetUrl) {
    try {
      // Extract domain for flexible matching
      const targetDomain = new URL(targetUrl).hostname.replace('www.', '');
      
      const searchResults = await this.page.$$eval('div.g, .tF2Cxc, .MjjYud', (results, domain) => {
        return results.map((result, index) => {
          try {
            const link = result.querySelector('a[href]');
            if (!link) return null;
            
            const url = link.href;
            const title = link.textContent || '';
            const visible = result.offsetParent !== null;
            
            // Flexible domain matching
            let resultDomain = '';
            try {
              const urlObj = new URL(url);
              resultDomain = urlObj.hostname.replace('www.', '');
            } catch (e) {
              return null;
            }
            
            if (resultDomain.includes(domain) || domain.includes(resultDomain) || url.includes(domain)) {
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
      
      // Use different selector strategy
      const links = await this.page.$$('div.g a, .tF2Cxc a, .MjjYud a');
      if (links[result.index]) {
        await humanMoveToElement(this.page, links[result.index]);
        await humanDelay(1000, 2000);
        await links[result.index].click();
      } else {
        throw new Error('Could not click search result');
      }

      await this.page.waitForNavigation({ 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      });
      
      await humanDelay(2000, 4000);
      return true;
    } catch (error) {
      console.error('Website click error:', error);
      throw new Error(`Failed to click website: ${error.message}`);
    }
  }

  async humanScroll() {
    try {
      await randomScroll(this.page);
      return true;
    } catch (error) {
      console.error('Scroll error:', error);
      // Don't throw error for scrolling, as it's non-critical
      return true;
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

// Helper function for human-like movement to elements
async function humanMoveToElement(page, element) {
  const box = await element.boundingBox();
  if (!box) throw new Error('Element not visible');

  const steps = 8;
  const startX = Math.random() * 100 + 50;
  const startY = Math.random() * 100 + 50;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = startX + (box.x + box.width / 2 - startX) * t;
    const y = startY + (box.y + box.height / 2 - startY) * t + Math.sin(t * Math.PI) * 15;
    
    await page.mouse.move(x, y);
    await humanDelay(40, 100);
  }
}

module.exports = StealthBrowser;
