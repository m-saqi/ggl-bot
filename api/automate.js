const express = require('express');
const cors = require('cors');
const StealthBrowser = require('../lib/browser');

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Google Automation Bot is running',
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
      error: 'Invalid website URL format'
    });
  }

  let browser = null;
  
  try {
    // Set response timeout
    res.setTimeout(120000, () => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Request timeout'
        });
      }
    });

    // Initialize browser
    browser = new StealthBrowser();
    await browser.launch();
    await browser.createPage();

    // Execute automation steps
    await browser.navigateToGoogle();
    await browser.searchKeyword(keyword);
    await browser.findAndClickWebsite(websiteUrl);
    await browser.humanScroll();

    res.json({
      success: true,
      message: 'Automation completed successfully',
      data: {
        keyword,
        websiteUrl,
        timestamp: new Date().toISOString(),
        steps: [
          'Google navigation',
          'Keyword search',
          'Website click',
          'Human scrolling'
        ]
      }
    });

  } catch (error) {
    console.error('Automation error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      step: 'Automation execution'
    });
    
  } finally {
    // Cleanup
    if (browser) {
      try {
        await browser.close();
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

// Local development
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}