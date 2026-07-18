const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const options = {
    hostname: 'sms-receive.net',
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
            const cardRegex = /href="(\d+)-([A-Za-z]+)"[\s\S]*?alt="([^"]*)"[\s\S]*?group-hover:text-violet-600[^>]*>\s*\+?(\d+)/g;
            let match;
            while ((match = cardRegex.exec(body)) !== null) {
              const pathId = `${match[1]}-${match[2]}`;
              const countryName = match[3].trim();
              const rawNum = match[4].trim();
              
              let countryCode = 'US';
              const lowerC = countryName.toLowerCase();
              if (lowerC.includes('united kingdom') || lowerC.includes('uk')) countryCode = 'GB';
              else if (lowerC.includes('canada')) countryCode = 'CA';
              else if (lowerC.includes('sweden')) countryCode = 'SE';
              else if (lowerC.includes('france')) countryCode = 'FR';
              else if (lowerC.includes('netherlands')) countryCode = 'NL';
              else if (lowerC.includes('germany')) countryCode = 'DE';
              
              numbers.push({
                number: rawNum,
                numberId: pathId,
                country: countryCode,
                countryName: countryName,
                formattedNumber: `+${rawNum}`,
                messageUrl: `https://sms-receive.net/${pathId}`
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
    return res.status(502).json({ error: "Failed to load active numbers. Please try again later." });
  }
};
