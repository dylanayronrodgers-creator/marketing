/**
 * Google Reviews Scraper for Axxess
 * Uses Puppeteer to scrape reviews from Google Maps
 * 
 * Usage: node scrape-reviews.js
 * Output: ../data/google-reviews.json
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Axxess Google Maps URL - search for the business
const SEARCH_QUERY = 'Axxess DSL axxess.co.za';
const GOOGLE_MAPS_URL = 'https://www.google.com/maps/search/' + encodeURIComponent(SEARCH_QUERY);

// Alternative: Direct place URL if known
// const GOOGLE_MAPS_URL = 'https://www.google.com/maps/place/Axxess+DSL/@...';

async function scrapeGoogleReviews() {
  console.log('🚀 Starting Google Reviews scraper for Axxess...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=en-US']
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('📍 Navigating to Google Maps...');
    await page.goto(GOOGLE_MAPS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for search results to load
    await page.waitForTimeout(3000);

    // Accept cookies if prompted
    try {
      const acceptButton = await page.$('button[aria-label="Accept all"]');
      if (acceptButton) {
        await acceptButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // Cookie prompt may not appear
    }

    // Click on the first result if we're on search results
    try {
      const firstResult = await page.$('a[href*="/maps/place/"]');
      if (firstResult) {
        await firstResult.click();
        await page.waitForTimeout(3000);
      }
    } catch (e) {
      console.log('Already on place page or no results found');
    }

    // Click on Reviews tab/button
    console.log('📝 Looking for reviews section...');
    
    // Try multiple selectors for the reviews button
    const reviewSelectors = [
      'button[aria-label*="Reviews"]',
      'button[data-tab-index="1"]',
      '[role="tab"]:nth-child(2)',
      'button:has-text("Reviews")'
    ];

    for (const selector of reviewSelectors) {
      try {
        const reviewBtn = await page.$(selector);
        if (reviewBtn) {
          await reviewBtn.click();
          await page.waitForTimeout(2000);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Scroll to load more reviews
    console.log('📜 Scrolling to load reviews...');
    const reviewsContainer = await page.$('div[role="main"]');
    
    if (reviewsContainer) {
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => {
          const scrollable = document.querySelector('div[role="main"]');
          if (scrollable) {
            scrollable.scrollBy(0, 1000);
          }
        });
        await page.waitForTimeout(1500);
      }
    }

    // Extract reviews
    console.log('🔍 Extracting reviews...');
    const reviews = await page.evaluate(() => {
      const reviewElements = document.querySelectorAll('[data-review-id], .jftiEf');
      const results = [];

      reviewElements.forEach((el, index) => {
        try {
          // Get reviewer name
          const nameEl = el.querySelector('.d4r55, .WNxzHc span');
          const name = nameEl ? nameEl.textContent.trim() : 'Anonymous';

          // Get rating (count filled stars)
          const starsEl = el.querySelector('.kvMYJc, .DU9Pgb');
          let rating = 5;
          if (starsEl) {
            const ariaLabel = starsEl.getAttribute('aria-label');
            if (ariaLabel) {
              const match = ariaLabel.match(/(\d)/);
              if (match) rating = parseInt(match[1]);
            }
          }

          // Get review text
          const textEl = el.querySelector('.wiI7pd, .MyEned span');
          const text = textEl ? textEl.textContent.trim() : '';

          // Get date
          const dateEl = el.querySelector('.rsqaWe, .DU9Pgb');
          const dateText = dateEl ? dateEl.textContent.trim() : '';

          // Only add if we have text
          if (text && text.length > 5) {
            results.push({
              reviewerName: name,
              rating: rating,
              text: text,
              dateText: dateText,
              index: index
            });
          }
        } catch (e) {
          // Skip malformed reviews
        }
      });

      return results;
    });

    console.log(`✅ Found ${reviews.length} reviews`);

    // Get overall rating
    const overallRating = await page.evaluate(() => {
      const ratingEl = document.querySelector('.fontDisplayLarge, .F7nice span');
      return ratingEl ? parseFloat(ratingEl.textContent) : null;
    });

    const totalReviews = await page.evaluate(() => {
      const countEl = document.querySelector('.fontBodySmall span[aria-label*="reviews"]');
      if (countEl) {
        const match = countEl.textContent.match(/(\d+)/);
        return match ? parseInt(match[1]) : null;
      }
      return null;
    });

    // Transform reviews to dashboard format
    const dashboardReviews = reviews.map((review, idx) => {
      const sentiment = review.rating >= 4 ? 'Positive' : review.rating === 3 ? 'Neutral' : 'Negative';
      const status = sentiment === 'Negative' ? 'Flagged (Negative)' : 'Pending';
      
      // Extract keywords from text
      const positiveWords = ['great', 'excellent', 'amazing', 'helpful', 'professional', 'friendly', 'fast', 'quick', 'good', 'best'];
      const negativeWords = ['slow', 'bad', 'poor', 'terrible', 'awful', 'unhelpful', 'rude', 'delayed'];
      const textLower = review.text.toLowerCase();
      const keywords = [...positiveWords, ...negativeWords].filter(w => textLower.includes(w));

      // Determine theme
      let theme = '';
      if (textLower.includes('support') || textLower.includes('help')) theme = 'Great support';
      else if (textLower.includes('fast') || textLower.includes('quick')) theme = 'Fast service';
      else if (textLower.includes('friendly') || textLower.includes('professional')) theme = 'Professional service';
      else if (textLower.includes('install') || textLower.includes('fibre')) theme = 'Smooth installation';
      else if (sentiment === 'Positive') theme = 'Great service';

      // Create TV snippet
      const tvSnippet = review.text.length > 100 
        ? review.text.substring(0, 100) + '...'
        : review.text;

      return {
        id: `GR-${String(10000 + idx).padStart(5, '0')}`,
        createdAt: parseRelativeDate(review.dateText),
        source: 'Google',
        rating: review.rating,
        sentiment: sentiment,
        status: status,
        agent: 'Unknown',
        team: 'Unknown',
        theme: theme,
        keywords: keywords.length > 0 ? keywords : ['customer feedback'],
        tvSnippet: tvSnippet,
        text: review.text,
        reviewerName: review.reviewerName
      };
    });

    // Save to file
    const outputPath = path.join(__dirname, '..', 'data', 'google-reviews.json');
    const output = {
      scrapedAt: new Date().toISOString(),
      businessName: 'Axxess',
      overallRating: overallRating,
      totalReviews: totalReviews,
      scrapedCount: dashboardReviews.length,
      reviews: dashboardReviews
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`💾 Saved ${dashboardReviews.length} reviews to ${outputPath}`);

    return output;

  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Helper to parse relative dates like "2 weeks ago"
function parseRelativeDate(dateText) {
  const now = new Date();
  const text = (dateText || '').toLowerCase();

  if (text.includes('day')) {
    const days = parseInt(text) || 1;
    now.setDate(now.getDate() - days);
  } else if (text.includes('week')) {
    const weeks = parseInt(text) || 1;
    now.setDate(now.getDate() - (weeks * 7));
  } else if (text.includes('month')) {
    const months = parseInt(text) || 1;
    now.setMonth(now.getMonth() - months);
  } else if (text.includes('year')) {
    const years = parseInt(text) || 1;
    now.setFullYear(now.getFullYear() - years);
  }

  return now.toISOString();
}

// Run the scraper
scrapeGoogleReviews()
  .then(result => {
    console.log('\n📊 Summary:');
    console.log(`   Overall Rating: ${result.overallRating || 'N/A'}`);
    console.log(`   Reviews Scraped: ${result.scrapedCount}`);
    console.log('\n✨ Done! Reviews saved to data/google-reviews.json');
  })
  .catch(err => {
    console.error('\n💥 Error:', err.message);
    process.exit(1);
  });
