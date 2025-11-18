const express = require('express');
const cors = require('cors');
const StealthBrowser = require('../lib/browser');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/automate', async (req, res) => {
  const { keyword, websiteUrl } = req.body;
  
  if (!keyword || !websiteUrl) {
    return res.status(400).json({ success: false, error: 'Missing keyword or websiteUrl' });
  }

  let browser = null;
  
  try {
    console.log(`🤖 Starting Bot: "${keyword}" -> ${websiteUrl}`);
    
    // Important: Vercel Serverless Functions have a timeout (usually 10s or 60s)
    // Ensure your Vercel project settings allow for 60s execution.
    
    browser = new StealthBrowser();
    await browser.launch();
    await browser.createPage();

    // 1. Go to Google
    await browser.navigateToGoogle();
    
    // 2. Search
    await browser.searchKeyword(keyword);
    
    // 3. Find Website (with Pagination)
    await browser.findAndClickWebsite(websiteUrl);
    
    // 4. Human Behavior on Site
    await browser.humanScroll();

    console.log('✅ Automation sequence completed');
    
    res.json({
      success: true,
      message: 'Successfully searched, found, clicked, and scrolled the website.',
      data: { keyword, websiteUrl, timestamp: new Date() }
    });

  } catch (error) {
    console.error('🚨 Automation Failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      suggestion: 'If running on Vercel Free Tier, execution might have timed out (10s limit).'
    });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = app;
