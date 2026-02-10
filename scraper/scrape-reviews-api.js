/**
 * Google Reviews Fetcher using Google Places API
 * This is the recommended approach if you have a Google API key
 * 
 * Setup:
 * 1. Get a Google Places API key from https://console.cloud.google.com
 * 2. Enable the Places API
 * 3. Set your API key in the GOOGLE_API_KEY environment variable or below
 * 
 * Usage: 
 *   set GOOGLE_API_KEY=your_api_key_here
 *   node scrape-reviews-api.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Set your Google Places API key here or use environment variable
const API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_API_KEY_HERE';

// Search query for finding the place
const SEARCH_QUERY = 'Axxess DSL South Africa';

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse JSON response'));
        }
      });
    }).on('error', reject);
  });
}

async function findPlaceId() {
  console.log('🔍 Searching for Axxess on Google Places...');
  
  const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(SEARCH_QUERY)}&inputtype=textquery&fields=place_id,name,formatted_address&key=${API_KEY}`;
  
  const result = await fetchJSON(searchUrl);
  
  if (result.status !== 'OK' || !result.candidates || result.candidates.length === 0) {
    throw new Error(`Place not found. Status: ${result.status}. ${result.error_message || ''}`);
  }
  
  const place = result.candidates[0];
  console.log(`✅ Found: ${place.name}`);
  console.log(`   Address: ${place.formatted_address}`);
  
  return place.place_id;
}

async function getPlaceDetails(placeId) {
  console.log('📝 Fetching place details and reviews...');
  
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews&key=${API_KEY}`;
  
  const result = await fetchJSON(detailsUrl);
  
  if (result.status !== 'OK') {
    throw new Error(`Failed to get place details. Status: ${result.status}. ${result.error_message || ''}`);
  }
  
  return result.result;
}

async function fetchGoogleReviews() {
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ Error: Please set your Google Places API key');
    console.log('\nTo get an API key:');
    console.log('1. Go to https://console.cloud.google.com');
    console.log('2. Create a project and enable the Places API');
    console.log('3. Create an API key');
    console.log('4. Run: set GOOGLE_API_KEY=your_key_here');
    console.log('   Then: node scrape-reviews-api.js');
    process.exit(1);
  }

  console.log('🚀 Starting Google Reviews fetch via Places API...\n');

  try {
    const placeId = await findPlaceId();
    const placeDetails = await getPlaceDetails(placeId);

    console.log(`\n📊 Overall Rating: ${placeDetails.rating}`);
    console.log(`   Total Reviews: ${placeDetails.user_ratings_total}`);
    console.log(`   Reviews Retrieved: ${(placeDetails.reviews || []).length}`);

    // Note: Google Places API only returns up to 5 most recent/relevant reviews
    // For more reviews, you need to use the Puppeteer scraper or a third-party service

    const reviews = (placeDetails.reviews || []).map((review, idx) => {
      const sentiment = review.rating >= 4 ? 'Positive' : review.rating === 3 ? 'Neutral' : 'Negative';
      const status = sentiment === 'Negative' ? 'Flagged (Negative)' : 'Pending';
      
      // Extract keywords
      const positiveWords = ['great', 'excellent', 'amazing', 'helpful', 'professional', 'friendly', 'fast', 'quick', 'good', 'best'];
      const negativeWords = ['slow', 'bad', 'poor', 'terrible', 'awful', 'unhelpful', 'rude', 'delayed'];
      const textLower = (review.text || '').toLowerCase();
      const keywords = [...positiveWords, ...negativeWords].filter(w => textLower.includes(w));

      // Determine theme
      let theme = '';
      if (textLower.includes('support') || textLower.includes('help')) theme = 'Great support';
      else if (textLower.includes('fast') || textLower.includes('quick')) theme = 'Fast service';
      else if (textLower.includes('friendly') || textLower.includes('professional')) theme = 'Professional service';
      else if (textLower.includes('install') || textLower.includes('fibre')) theme = 'Smooth installation';
      else if (sentiment === 'Positive') theme = 'Great service';

      const tvSnippet = (review.text || '').length > 100 
        ? review.text.substring(0, 100) + '...'
        : review.text;

      return {
        id: `GR-${String(10000 + idx).padStart(5, '0')}`,
        createdAt: new Date(review.time * 1000).toISOString(),
        source: 'Google',
        rating: review.rating,
        sentiment: sentiment,
        status: status,
        agent: 'Unknown',
        team: 'Unknown',
        theme: theme,
        keywords: keywords.length > 0 ? keywords : ['customer feedback'],
        tvSnippet: tvSnippet,
        text: review.text || '',
        reviewerName: review.author_name,
        profileUrl: review.author_url,
        relativeTime: review.relative_time_description
      };
    });

    // Save to file
    const outputPath = path.join(__dirname, '..', 'data', 'google-reviews.json');
    const output = {
      scrapedAt: new Date().toISOString(),
      businessName: placeDetails.name,
      overallRating: placeDetails.rating,
      totalReviews: placeDetails.user_ratings_total,
      scrapedCount: reviews.length,
      note: 'Google Places API only returns up to 5 reviews. Use the Puppeteer scraper for more.',
      reviews: reviews
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Saved ${reviews.length} reviews to ${outputPath}`);

    return output;

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

fetchGoogleReviews()
  .then(result => {
    console.log('\n✨ Done!');
  })
  .catch(err => {
    process.exit(1);
  });
