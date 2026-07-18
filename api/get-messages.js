const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const numberId = req.query.numberId;
  const number = req.query.number;
  
  if (!numberId && !number) {
    return res.status(400).json({ error: "Missing 'numberId' or 'number' query parameter." });
  }

  // Try to determine the correct URL path
  // receivesms.co uses pattern: /us-phone-number/21815/
  // We need the numberId for this
  if (!numberId) {
    return res.status(200).json({ 
      messages: [],
      viewOnline: `https://www.receivesms.co/`,
      info: 'Select a number to view its messages directly on the source site.'
    });
  }

  const country = (req.query.country || 'us').toLowerCase();
  const pathPrefix = country === 'gb' ? 'british' : 
                     country === 'ca' ? 'canadian' :
                     country === 'se' ? 'swedish' :
                     country === 'nl' ? 'dutch' :
                     country === 'fr' ? 'french' : 
                     country;
  const pagePath = `/${pathPrefix}-phone-number/${numberId}/`;
  const viewUrl = `https://www.receivesms.co${pagePath}`;

  const scrapeMessages = () => {
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.receivesms.co',
        port: 443,
        path: pagePath,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://www.receivesms.co/',
          'DNT': '1'
        },
        timeout: 8000
      };

      const request = https.get(options, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          resolve({ status: 'redirect', url: response.headers.location });
          return;
        }
        if (response.statusCode === 403 || response.statusCode === 429) {
          resolve({ status: 'blocked' });
          return;
        }

        let body = '';
        response.on('data', (chunk) => body += chunk);
        response.on('end', () => {
          try {
            const messages = [];
            
            // Try to match table rows with SMS data
            // Pattern: <tr>...<td>sender</td><td>message</td><td>time</td>...</tr>
            const rowRegex = /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
            let match;
            while ((match = rowRegex.exec(body)) !== null) {
              const col1 = match[1].replace(/<[^>]*>/g, '').trim();
              const col2 = match[2].replace(/<[^>]*>/g, '').trim();
              const col3 = match[3].replace(/<[^>]*>/g, '').trim();
              
              // Skip header rows
              if (col1.toLowerCase() === 'from' || col1.toLowerCase() === 'sender') continue;
              if (!col2 || col2.length < 3) continue;
              
              messages.push({
                sender: col1 || 'Unknown',
                text: col2,
                time: col3 || 'Just now'
              });
            }

            // Also try div-based message cards
            if (messages.length === 0) {
              const cardRegex = /class="[^"]*message[^"]*"[^>]*>[\s\S]*?(?:from|sender)[^>]*>([^<]+)[\s\S]*?(?:text|body|content)[^>]*>([\s\S]*?)<\/[\s\S]*?(?:time|date|ago)[^>]*>([^<]+)/gi;
              while ((match = cardRegex.exec(body)) !== null) {
                messages.push({
                  sender: match[1].trim(),
                  text: match[2].replace(/<[^>]*>/g, '').trim(),
                  time: match[3].trim()
                });
              }
            }

            if (messages.length > 0) {
              resolve({ status: 'ok', messages });
            } else if (body.length > 1000) {
              // Page loaded but we couldn't parse messages - might be different format
              resolve({ status: 'parse_fail', bodyLength: body.length });
            } else {
              resolve({ status: 'empty' });
            }
          } catch (e) {
            resolve({ status: 'error', msg: e.message });
          }
        });
      });
      request.on('error', (e) => resolve({ status: 'error', msg: e.message }));
      request.on('timeout', () => { request.destroy(); resolve({ status: 'timeout' }); });
    });
  };

  const result = await scrapeMessages();
  
  if (result.status === 'ok' && result.messages.length > 0) {
    return res.status(200).json({ 
      messages: result.messages,
      source: 'live' 
    });
  }

  // If scraping failed for any reason, return helpful response with direct link
  return res.status(200).json({ 
    messages: [],
    source: 'unavailable',
    viewOnline: viewUrl,
    reason: result.status,
    info: 'Messages could not be scraped due to anti-bot protection. Click the link below to view messages directly on the source website.'
  });
};
