const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const options = {
    hostname: 'temp-sms.org',
    port: 443,
    path: '/',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    timeout: 5000
  };

  const scrapeNumbers = () => {
    return new Promise((resolve) => {
      const request = https.get(options, (response) => {
        if (response.statusCode !== 200) {
          resolve(null);
          return;
        }

        let body = '';
        response.on('data', (chunk) => body += chunk);
        response.on('end', () => {
          try {
            const numbers = [];
            const cardRegex = /href="\/sms\/(\d+)"[^>]*>[\s\S]*?<h3[^>]*>\s*\+?([^<]+)\s*<\/h3>/g;
            let match;
            while ((match = cardRegex.exec(body)) !== null) {
              const rawNum = match[1];
              const formattedNum = match[2].trim();
              
              // Map country code based on prefix
              let country = 'US';
              let countryName = 'United States';
              
              if (rawNum.startsWith('44')) { country = 'GB'; countryName = 'United Kingdom'; }
              else if (rawNum.startsWith('1')) { country = 'US'; countryName = 'United States'; }
              else if (rawNum.startsWith('64')) { country = 'NZ'; countryName = 'New Zealand'; }
              else if (rawNum.startsWith('46')) { country = 'SE'; countryName = 'Sweden'; }
              else if (rawNum.startsWith('31')) { country = 'NL'; countryName = 'Netherlands'; }
              else if (rawNum.startsWith('33')) { country = 'FR'; countryName = 'France'; }
              else if (rawNum.startsWith('358')) { country = 'FI'; countryName = 'Finland'; }
              else if (rawNum.startsWith('91')) { country = 'IN'; countryName = 'India'; }
              else if (rawNum.startsWith('61')) { country = 'AU'; countryName = 'Australia'; }
              else if (rawNum.startsWith('7')) { country = 'RU'; countryName = 'Russia'; }
              else if (rawNum.startsWith('32')) { country = 'BE'; countryName = 'Belgium'; }
              else if (rawNum.startsWith('380')) { country = 'UA'; countryName = 'Ukraine'; }
              else if (rawNum.startsWith('372')) { country = 'EE'; countryName = 'Estonia'; }
              else if (rawNum.startsWith('385')) { country = 'HR'; countryName = 'Croatia'; }
              else if (rawNum.startsWith('43')) { country = 'AT'; countryName = 'Austria'; }
              else if (rawNum.startsWith('60')) { country = 'MY'; countryName = 'Malaysia'; }
              else if (rawNum.startsWith('62')) { country = 'ID'; countryName = 'Indonesia'; }
              
              numbers.push({
                number: rawNum,
                numberId: rawNum,
                country: country,
                countryName: countryName,
                formattedNumber: formattedNum,
                messageUrl: `https://temp-sms.org/sms/${rawNum}`
              });
            }
            resolve(numbers);
          } catch (e) {
            resolve(null);
          }
        });
      });
      request.on('error', () => resolve(null));
      request.on('timeout', () => {
        request.destroy();
        resolve(null);
      });
    });
  };

  const result = await scrapeNumbers();
  
  if (result && result.length > 0) {
    return res.status(200).json({ numbers: result, source: 'live' });
  } else {
    return res.status(200).json({ numbers: [], source: 'error', error: "Failed to scrape numbers from gateway." });
  }
};
