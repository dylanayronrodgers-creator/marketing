/**
 * Google Reviews Scraper using SerpAPI
 * 
 * SerpAPI provides reliable, structured Google Reviews data.
 * This is the recommended approach for production use.
 * 
 * Setup:
 * 1. Get your API key from https://serpapi.com/dashboard
 * 2. Set your API key: set SERPAPI_KEY=your_api_key_here
 * 
 * Usage: node scrape-reviews-serpapi.js
 * Output: ../data/google-reviews.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Set your SerpAPI key via environment variable
// Windows: set SERPAPI_KEY=your_key_here
// Mac/Linux: export SERPAPI_KEY=your_key_here
const SERPAPI_KEY = process.env.SERPAPI_KEY;

// Search query to find Axxess on Google Maps
const SEARCH_QUERY = 'Axxess DSL South Africa';

// Data ID for Axxess - found via SerpAPI
// This skips the search step and saves 1 API credit per run
let PLACE_DATA_ID = '0x1e7ad23632467f91:0x57bec90a7dc50866';

// Cache settings - only scrape once every 12 hours to save API credits
const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
const CACHE_FILE = path.join(__dirname, '.last-scrape.json');

function shouldScrape() {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return true;
    }
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const lastScrape = new Date(cache.lastScrape).getTime();
    const now = Date.now();
    const hoursSince = (now - lastScrape) / (1000 * 60 * 60);
    
    if (now - lastScrape < CACHE_DURATION_MS) {
      console.log(`⏰ Last scrape was ${hoursSince.toFixed(1)} hours ago.`);
      console.log(`   Next scrape allowed in ${(12 - hoursSince).toFixed(1)} hours.`);
      console.log(`   Use --force to scrape anyway.`);
      return false;
    }
    return true;
  } catch (e) {
    return true;
  }
}

function updateCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify({
    lastScrape: new Date().toISOString()
  }, null, 2));
}

async function fetchJSON(url, retries = 4) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 120000 }, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            return;
          }
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Failed to parse JSON: ' + data.substring(0, 200)));
            }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
      });
      return result;
    } catch (err) {
      if (attempt < retries) {
        const delay = 10 + (attempt * 5);
        console.log(`   ⚠️ Attempt ${attempt + 1} failed: ${err.message}. Retrying in ${delay}s...`);
        await new Promise(r => setTimeout(r, delay * 1000));
      } else {
        throw err;
      }
    }
  }
}

async function findPlaceDataId() {
  if (PLACE_DATA_ID) {
    console.log('📍 Using cached Place Data ID:', PLACE_DATA_ID);
    return PLACE_DATA_ID;
  }

  console.log('🔍 Searching for Axxess on Google Maps...');
  
  const searchUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(SEARCH_QUERY)}&type=search&api_key=${SERPAPI_KEY}`;
  
  const result = await fetchJSON(searchUrl);
  
  if (result.error) {
    throw new Error(`SerpAPI error: ${result.error}`);
  }
  
  if (!result.local_results || result.local_results.length === 0) {
    throw new Error('No results found for Axxess. Try a different search query.');
  }
  
  // Find Axxess in results
  const axxess = result.local_results.find(r => 
    r.title.toLowerCase().includes('axxess')
  ) || result.local_results[0];
  
  console.log(`✅ Found: ${axxess.title}`);
  console.log(`   Address: ${axxess.address || 'N/A'}`);
  console.log(`   Rating: ${axxess.rating} (${axxess.reviews} reviews)`);
  console.log(`   Data ID: ${axxess.data_id}`);
  
  return axxess.data_id;
}

async function fetchReviews(dataId, nextPageToken = null) {
  console.log(nextPageToken ? '📄 Fetching next page of reviews...' : '📝 Fetching reviews...');
  
  // sort_by=date gets the most recent reviews instead of "most relevant"
  // SerpAPI values: date (newest), rating_high, rating_low — NOT "newestFirst"
  let reviewsUrl = `https://serpapi.com/search.json?engine=google_maps_reviews&data_id=${dataId}&sort_by=date&hl=en&api_key=${SERPAPI_KEY}`;
  
  if (nextPageToken) {
    reviewsUrl += `&next_page_token=${nextPageToken}`;
  }
  
  const result = await fetchJSON(reviewsUrl);
  
  if (result.error) {
    throw new Error(`SerpAPI error: ${result.error}`);
  }
  
  return result;
}

async function scrapeAllReviews() {
  const forceRun = process.argv.includes('--force');
  
  if (!SERPAPI_KEY || SERPAPI_KEY === 'YOUR_SERPAPI_KEY_HERE') {
    console.error('❌ Error: Please set your SerpAPI key');
    console.log('\nTo set your API key:');
    console.log('  Windows: set SERPAPI_KEY=your_key_here');
    console.log('  Mac/Linux: export SERPAPI_KEY=your_key_here');
    console.log('\nGet your key at: https://serpapi.com/dashboard');
    process.exit(1);
  }

  // Check 12-hour cache unless --force is used
  if (!forceRun && !shouldScrape()) {
    console.log('\n✅ Using cached reviews. No API credits used.');
    process.exit(0);
  }

  console.log('🚀 Starting Google Reviews scrape via SerpAPI...\n');
  console.log('⚠️  Note: Each page of reviews uses 1 API credit\n');

  try {
    // Step 1: Find the place
    const dataId = await findPlaceDataId();
    
    // Step 2: Fetch reviews (first page)
    let allReviews = [];
    let result = await fetchReviews(dataId);
    
    const placeInfo = result.place_info || {};
    console.log(`\n📊 Place Info:`);
    console.log(`   Name: ${placeInfo.title || 'Axxess'}`);
    console.log(`   Rating: ${placeInfo.rating}`);
    console.log(`   Total Reviews: ${placeInfo.reviews}`);
    
    if (result.reviews) {
      allReviews = allReviews.concat(result.reviews);
      console.log(`   Fetched: ${result.reviews.length} reviews`);
    }
    
    // Step 3: Fetch more pages (each page = 1 API credit)
    let pageCount = 1;
    const maxPages = 10; // 10 pages ≈ 100 reviews, uses 10 credits per run
    
    while (result.serpapi_pagination && result.serpapi_pagination.next_page_token && pageCount < maxPages) {
      pageCount++;
      try {
        result = await fetchReviews(dataId, result.serpapi_pagination.next_page_token);
        if (result.reviews) {
          allReviews = allReviews.concat(result.reviews);
          console.log(`   Page ${pageCount}: +${result.reviews.length} reviews (Total: ${allReviews.length})`);
        }
      } catch (pageErr) {
        console.log(`   ⚠️ Page ${pageCount} failed: ${pageErr.message}. Continuing with ${allReviews.length} reviews already fetched.`);
        break;
      }
    }
    
    console.log(`\n✅ Total reviews fetched: ${allReviews.length}`);

    // Log date range of fetched reviews
    const dates = allReviews.map(r => r.iso_date || r.date || '').filter(Boolean);
    if (dates.length) {
      console.log(`📅 Date range: ${dates[dates.length - 1]} → ${dates[0]}`);
    }
    
    // Step 4: Transform to dashboard format
    const dashboardReviews = allReviews.map((review, idx) => {
      const rating = review.rating || 5;
      const sentiment = rating >= 4 ? 'Positive' : rating === 3 ? 'Neutral' : 'Negative';
      const status = sentiment === 'Negative' ? 'Flagged (Negative)' : 'Pending';
      
      // Generate unique ID based on reviewer and date to avoid duplicates across scrapes
      const reviewerId = review.user?.link?.match(/contrib\/(\d+)/)?.[1] || 'unknown';
      const reviewDate = review.iso_date || review.date || '';
      const uniqueId = `GR-${reviewerId.slice(-8)}-${reviewDate.slice(0, 10).replace(/-/g, '')}`;
      
      // Extract keywords from text
      const text = review.snippet || review.extracted_snippet?.original || '';
      const textLower = text.toLowerCase();
      
      const positiveWords = ['great', 'excellent', 'amazing', 'helpful', 'professional', 'friendly', 'fast', 'quick', 'good', 'best', 'reliable', 'awesome'];
      const negativeWords = ['slow', 'bad', 'poor', 'terrible', 'awful', 'unhelpful', 'rude', 'delayed', 'worst', 'horrible'];
      const keywords = [...positiveWords, ...negativeWords].filter(w => textLower.includes(w));
      
      // Determine theme
      let theme = '';
      if (textLower.includes('support') || textLower.includes('help')) theme = 'Great support';
      else if (textLower.includes('fast') || textLower.includes('quick') || textLower.includes('speed')) theme = 'Fast service';
      else if (textLower.includes('friendly') || textLower.includes('professional')) theme = 'Professional service';
      else if (textLower.includes('install') || textLower.includes('fibre') || textLower.includes('fiber')) theme = 'Smooth installation';
      else if (textLower.includes('price') || textLower.includes('value') || textLower.includes('affordable')) theme = 'Great value';
      else if (sentiment === 'Positive') theme = 'Great service';
      else if (sentiment === 'Negative') theme = 'Needs improvement';
      
      // TV snippet - store full text, let dashboard handle truncation
      const tvSnippet = text;
      
      // Parse date
      let createdAt;
      if (review.iso_date) {
        createdAt = review.iso_date;
      } else if (review.date) {
        createdAt = parseRelativeDate(review.date);
      } else {
        createdAt = new Date().toISOString();
      }
      
      return {
        id: uniqueId,
        createdAt: createdAt,
        source: 'Google',
        rating: rating,
        sentiment: sentiment,
        status: status,
        agent: 'Unknown',
        team: 'Unknown',
        theme: theme,
        keywords: keywords.length > 0 ? keywords : ['customer feedback'],
        tvSnippet: tvSnippet,
        text: text,
        reviewerName: review.user?.name || 'Anonymous',
        reviewerLink: review.user?.link || null,
        reviewerThumbnail: review.user?.thumbnail || null,
        likes: review.likes || 0
      };
    });
    
    // Step 5: Save to file
    const outputPath = path.join(__dirname, '..', 'data', 'google-reviews.json');
    const output = {
      scrapedAt: new Date().toISOString(),
      businessName: placeInfo.title || 'Axxess',
      overallRating: placeInfo.rating || null,
      totalReviews: placeInfo.reviews || allReviews.length,
      scrapedCount: dashboardReviews.length,
      dataId: dataId,
      reviews: dashboardReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Saved ${dashboardReviews.length} reviews to data/google-reviews.json`);
    
    // Update cache timestamp
    updateCache();
    
    // Show sample
    if (dashboardReviews.length > 0) {
      console.log('\n📋 Sample review:');
      const sample = dashboardReviews[0];
      console.log(`   "${sample.tvSnippet}"`);
      console.log(`   - ${sample.reviewerName}, ${sample.rating}★`);
    }
    
    return output;
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

function parseRelativeDate(dateText) {
  const now = new Date();
  const text = (dateText || '').toLowerCase();
  
  const match = text.match(/(\d+)/);
  const num = match ? parseInt(match[1]) : 1;
  
  if (text.includes('minute') || text.includes('min')) {
    now.setMinutes(now.getMinutes() - num);
  } else if (text.includes('hour') || text.includes('hr')) {
    now.setHours(now.getHours() - num);
  } else if (text.includes('day')) {
    now.setDate(now.getDate() - num);
  } else if (text.includes('week')) {
    now.setDate(now.getDate() - (num * 7));
  } else if (text.includes('month')) {
    now.setMonth(now.getMonth() - num);
  } else if (text.includes('year')) {
    now.setFullYear(now.getFullYear() - num);
  } else if (text.includes('just now') || text.includes('moment')) {
    // Keep as now
  }
  
  return now.toISOString();
}

// Run the scraper
scrapeAllReviews()
  .then(result => {
    console.log('\n✨ Done! Reviews are ready for the dashboard.');
    console.log('   Open the dashboard to see the reviews automatically loaded.');
  })
  .catch(err => {
    process.exit(1);
  });
