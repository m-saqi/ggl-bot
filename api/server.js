// Local development server
const app = require('./automate');

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Google Automation Bot running on port ${PORT}`);
    console.log(`📝 Endpoint: http://localhost:${PORT}/api/automate`);
    console.log(`🏠 Home: http://localhost:${PORT}/`);
  });
}
