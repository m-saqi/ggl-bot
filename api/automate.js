const express = require('express');
const cors = require('cors');
const StealthBrowser = require('../lib/browser');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static('public'));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Google Automation Bot is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: '/api/automate'
    }
  });
});

// Main automation endpoint
app.post('/api/automate', async (req, res) => {
  const { keyword, websiteUrl } = req.body;
  
  // Validate inputs
  if (!keyword || !websiteUrl) {
    return res.status(400).json({
      success: false,
      error: 'Both keyword and websiteUrl are required'
    });
  }

  // Validate URL format
  try {
    new URL(websiteUrl);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid website URL format. Please include http:// or https://'
    });
  }

  let browser = null;
  
  try {
    console.log(`Starting automation for keyword: "${keyword}", website: ${websiteUrl}`);
    
    // Set longer timeout for Vercel
    res.setTimeout(90000, () => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Request timeout - automation took too long'
        });
      }
    });

    // Initialize browser with error handling
    browser = new StealthBrowser();
    await browser.launch();
    await browser.createPage();

    // Execute steps with individual error handling
    const steps = [
      { name: 'Navigating to Google', fn: () => browser.navigateToGoogle() },
      { name: 'Searching keyword', fn: () => browser.searchKeyword(keyword) },
      { name: 'Finding website', fn: () => browser.findAndClickWebsite(websiteUrl) },
      { name: 'Scrolling page', fn: () => browser.humanScroll() }
    ];

    for (const step of steps) {
      console.log(`Executing step: ${step.name}`);
      await step.fn();
    }

    console.log('Automation completed successfully');
    
    res.json({
      success: true,
      message: 'Automation completed successfully',
      data: {
        keyword,
        websiteUrl,
        timestamp: new Date().toISOString(),
        steps: steps.map(s => s.name)
      }
    });

  } catch (error) {
    console.error('Automation error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      step: 'Automation execution',
      suggestion: 'This might be due to temporary network issues or Google blocking the request. Please try again later.'
    });
    
  } finally {
    // Cleanup with error handling
    if (browser) {
      try {
        await browser.close();
        console.log('Browser closed successfully');
      } catch (closeError) {
        console.error('Browser close error:', closeError);
      }
    }
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Export for Vercel
module.exports = app;
