/**
 * Load Google Reviews into Dashboard
 * 
 * This script reads the scraped reviews and outputs JavaScript
 * that can be used to load them into the dashboard's localStorage
 * 
 * Usage: node load-reviews.js
 */

const fs = require('fs');
const path = require('path');

const reviewsPath = path.join(__dirname, '..', 'data', 'google-reviews.json');

if (!fs.existsSync(reviewsPath)) {
  console.error('❌ No reviews file found at data/google-reviews.json');
  console.log('Run the scraper first: npm run scrape');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(reviewsPath, 'utf8'));

console.log(`📊 Loaded ${data.reviews.length} reviews from ${data.businessName}`);
console.log(`   Overall Rating: ${data.overallRating}`);
console.log(`   Scraped At: ${data.scrapedAt}\n`);

// Generate the JavaScript to inject into the browser console
const script = `
// Paste this into the browser console on the dashboard page
(function() {
  var STORAGE_KEY = "axxess_dashboard_state_v2";
  var state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  
  var googleReviews = ${JSON.stringify(data.reviews, null, 2)};
  
  // Merge with existing items or replace
  if (!state.items) state.items = [];
  
  // Remove old Google reviews
  state.items = state.items.filter(function(item) {
    return !item.id.startsWith('GR-');
  });
  
  // Add new Google reviews
  state.items = googleReviews.concat(state.items);
  
  // Sort by date
  state.items.sort(function(a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  
  console.log('✅ Loaded ' + googleReviews.length + ' Google reviews into dashboard');
  console.log('Refresh the page to see the reviews');
  
  // Auto-refresh
  location.reload();
})();
`;

// Save the injection script
const scriptPath = path.join(__dirname, 'inject-reviews.js');
fs.writeFileSync(scriptPath, script);

console.log('📝 Generated browser injection script: scraper/inject-reviews.js');
console.log('\nTo load reviews into the dashboard:');
console.log('1. Open the dashboard in your browser');
console.log('2. Open Developer Tools (F12)');
console.log('3. Go to Console tab');
console.log('4. Paste the contents of inject-reviews.js and press Enter');
console.log('\nOr use the auto-loader by opening the dashboard with the reviews-loader.html file');
