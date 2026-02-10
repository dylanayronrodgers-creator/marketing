# Axxess Google Reviews Scraper

Scrapes Google Reviews for axxess.co.za and integrates them with the Customer Recognition Dashboard.

## Setup

```bash
cd scraper
npm install
```

## Usage

### Option 1: SerpAPI (Recommended) ⭐

SerpAPI provides reliable, structured Google Reviews data. Best for production use.

1. Get your API key from [SerpAPI Dashboard](https://serpapi.com/dashboard)
2. Set your API key:

```bash
# Windows
set SERPAPI_KEY=your_api_key_here

# Mac/Linux
export SERPAPI_KEY=your_api_key_here
```

3. Run the scraper:

```bash
npm run scrape
```

**API Credits:** 
- Finding the place: 1 credit
- Each page of reviews: 1 credit (~10 reviews per page)
- With 250 searches/month, you can scrape ~120 reviews per run, twice a month

### Option 2: Puppeteer Scraper (No API Key Required)

Scrapes reviews directly from Google Maps using browser automation.

```bash
npm run scrape:puppeteer
```

**Note:** Less reliable as Google's page structure can change.

### Option 3: Google Places API

Requires a Google API key but only returns up to 5 reviews.

```bash
# Windows
set GOOGLE_API_KEY=your_api_key_here

npm run scrape:places-api
```

## Output

Both scrapers output to `data/google-reviews.json` with the following format:

```json
{
  "scrapedAt": "2026-01-29T13:00:00.000Z",
  "businessName": "Axxess",
  "overallRating": 4.2,
  "totalReviews": 156,
  "scrapedCount": 10,
  "reviews": [
    {
      "id": "GR-10000",
      "createdAt": "2026-01-28T10:30:00.000Z",
      "source": "Google",
      "rating": 5,
      "sentiment": "Positive",
      "status": "Pending",
      "agent": "Unknown",
      "team": "Unknown",
      "theme": "Great support",
      "keywords": ["excellent", "helpful"],
      "tvSnippet": "Excellent service...",
      "text": "Full review text...",
      "reviewerName": "John M."
    }
  ]
}
```

## Dashboard Integration

The dashboard automatically loads reviews from `data/google-reviews.json` when the page loads.

### Manual Loading

If you need to manually inject reviews:

1. Run `node load-reviews.js` to generate the injection script
2. Open the dashboard in your browser
3. Open Developer Tools (F12) → Console
4. Paste the contents of `inject-reviews.js` and press Enter

## Scheduling

To keep reviews updated, schedule the scraper to run periodically:

### Windows Task Scheduler

```batch
cd C:\path\to\windsurf-project-2\scraper
npm run scrape
```

### Linux/Mac Cron

```bash
0 6 * * * cd /path/to/windsurf-project-2/scraper && npm run scrape
```

## Limitations

- **Puppeteer scraper**: May break if Google changes their page structure
- **Places API**: Only returns up to 5 most relevant reviews
- Reviews are assigned to "Unknown" agent/team - use the Manager Portal to assign them

## Troubleshooting

### "No reviews found"
- Google may be blocking automated requests
- Try running with `headless: false` in the scraper to debug

### "API key invalid"
- Ensure the Places API is enabled in Google Cloud Console
- Check your API key has no restrictions blocking the request
