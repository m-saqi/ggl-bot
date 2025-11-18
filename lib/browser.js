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
    const executablePath = await chromium.executablePath;
    
    this.browser = await puppeteer.launch({
      executablePath,
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
        '--window-size=1920,1080'
      ],
      headless: true,
      ignoreHTTPSErrors: true,
    });

    return this.browser;
  }

  async createPage() {
    this.page = await this.browser.newPage();
    
    // Random user agent
    const userAgent = new UserAgent({ deviceCategory: 'desktop' });
    await this.page.setUserAgent(userAgent.toString());

    // Stealth evasion techniques
    await this.page.evaluateOnNewDocument(() => {
      // Override webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Override languages property
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Override plugins property
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Mock chrome runtime
      window.chrome = {
        runtime: {},
        loadTimes: () => {},
        csi: () => {},
        app: {}
      };
    });

    // Set viewport
    await this.page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    // Block images and stylesheets for faster loading
    await this.page.setRequestInterception(true);
    this.page.on('request', (req) => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    return this.page;
  }

  async navigateToGoogle() {
    await this.page.goto('https://www.google.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for random human delay
    await humanDelay(2000, 5000);
  }

  async searchKeyword(keyword) {
    // Human-like typing
    const searchSelector = 'textarea[name="q"], input[name="q"]';
    await this.page.waitForSelector(searchSelector, { timeout: 10000 });
    
    // Human-like mouse movement to search box
    await humanMove(this.page, searchSelector);
    
    // Type with human-like delays
    await this.page.click(searchSelector);
    await humanDelay(500, 1000);
    
    for (let char of keyword) {
      await this.page.type(searchSelector, char, { delay: Math.random() * 100 + 50 });
    }
    
    await humanDelay(1000, 2000);
    
    // Press enter instead of clicking search button
    await this.page.keyboard.press('Enter');
    await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    
    await humanDelay(3000, 5000);
  }

  async findAndClickWebsite(targetUrl) {
    const searchResults = await this.page.$$eval('div.g', (results, targetUrl) => {
      return results.map((result, index) => {
        const link = result.querySelector('a');
        const url = link ? link.href : '';
        const title = link ? link.textContent : '';
        return { index, url, title, element: result };
      }).filter(item => item.url.includes(targetUrl.replace(/https?:\/\//, '')));
    }, targetUrl);

    if (searchResults.length === 0) {
      throw new Error(`Website ${targetUrl} not found in search results`);
    }

    // Click the first matching result
    const result = searchResults[0];
    const resultSelector = `div.g:nth-child(${result.index + 1}) a`;
    
    await humanMove(this.page, resultSelector);
    await humanDelay(1000, 2000);
    
    await this.page.click(resultSelector);
    await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    
    await humanDelay(3000, 5000);
  }

  async humanScroll() {
    await randomScroll(this.page);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = StealthBrowser;