const https = require('https');

// Scrape REAL active numbers from receivesms.co
const SOURCES = [
  { url: '/us-phone-numbers/us/', country: 'US', countryName: 'United States' },
  { url: '/british-phone-numbers/gb/', country: 'GB', countryName: 'United Kingdom' },
  { url: '/canadian-phone-numbers/ca/', country: 'CA', countryName: 'Canada' },
  { url: '/swedish-phone-numbers/se/', country: 'SE', countryName: 'Sweden' },
  { url: '/dutch-phone-numbers/nl/', country: 'NL', countryName: 'Netherlands' },
  { url: '/french-phone-numbers/fr/', country: 'FR', countryName: 'France' }
];

function scrapeCountryPage(source) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'www.receivesms.co',
      port: 443,
      path: source.url,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 6000
    };

    const req = https.get(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const numbers = [];
          // Match links like: <a href="/us-phone-number/20693/">+1 219-295-8005</a>
          // or: href="/us-phone-number/21815/"
          const linkRegex = /href="\/[a-z\-]+-phone-number\/(\d+)\/"[^>]*>([^<]+)</g;
          let match;
          while ((match = linkRegex.exec(body)) !== null) {
            const id = match[1];
            const rawNumber = match[2].trim();
            // Skip non-number text
            if (!/^\+?\d/.test(rawNumber)) continue;
            
            const cleanNumber = rawNumber.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
            
            numbers.push({
              number: cleanNumber,
              numberId: id,
              country: source.country,
              countryName: source.countryName,
              formattedNumber: rawNumber,
              messageUrl: `https://www.receivesms.co/${source.country.toLowerCase()}-phone-number/${id}/`
            });
          }
          resolve(numbers.slice(0, 5)); // Take first 5 per country
        } catch (e) {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  try {
    // Scrape all country pages in parallel
    const results = await Promise.all(SOURCES.map(s => scrapeCountryPage(s)));
    const allNumbers = results.flat();

    if (allNumbers.length > 0) {
      return res.status(200).json({ 
        numbers: allNumbers, 
        source: 'live',
        count: allNumbers.length 
      });
    }
  } catch (e) {
    // Fall through to fallback
  }

  // If scraping completely fails, return error so frontend knows
  return res.status(200).json({ 
    numbers: [], 
    source: 'error',
    error: 'Could not fetch live numbers. Please try again later.' 
  });
};
