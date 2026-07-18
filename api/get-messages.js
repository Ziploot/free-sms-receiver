const https = require('https');

function cleanMessage(text) {
  // Remove starting serialized numbers if any (e.g. "1 ")
  let cleaned = text.replace(/^\d\s+/, '');
  
  // Remove lookalike non-ASCII watermarks
  cleaned = cleaned.split(/\s+/).filter(word => {
    for (let i = 0; i < word.length; i++) {
      if (word.charCodeAt(i) > 127 || word.charAt(i) === '⎩') {
        return false;
      }
    }
    return true;
  }).join(' ');

  return cleaned.replace(/\s+/g, ' ').trim();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const numberId = req.query.numberId;
  const number = req.query.number;
  
  if (!numberId || !number) {
    return res.status(400).json({ error: "Missing 'numberId' or 'number' query parameter." });
  }

  const scrapeMessages = () => {
    return new Promise((resolve) => {
      const options = {
        hostname: 'temp-sms.org',
        port: 443,
        path: `/sms/${number}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
        },
        timeout: 5000
      };

      const request = https.get(options, (response) => {
        if (response.statusCode !== 200) {
          resolve(null);
          return;
        }

        let body = '';
        response.on('data', (chunk) => body += chunk);
        response.on('end', () => {
          try {
            const messages = [];
            // Parse message cards
            const msgRegex = /col-sm-10 col-md-10 col-lg-10"[\s\S]*?<b>\+?([^<]+)<\/b>[\s\S]*?date-padding">([\s\S]*?)-\s*<span[\s\S]*?msg-padding">([\s\S]*?)<\/div>/g;
            let match;
            while ((match = msgRegex.exec(body)) !== null) {
              const sender = match[1].trim();
              const time = match[2].replace(/ago[\s\S]*/, 'ago').trim();
              const rawText = match[3].trim();
              
              // Skip JavaScript templates
              if (sender.includes('value.') || rawText.includes('value.') || rawText.includes("'+")) {
                continue;
              }
              
              const cleanText = cleanMessage(rawText);
              
              messages.push({
                sender,
                time,
                text: cleanText
              });
            }
            resolve(messages);
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

  const result = await scrapeMessages();

  if (result) {
    return res.status(200).json({ 
      messages: result, 
      source: 'live' 
    });
  } else {
    return res.status(200).json({ 
      messages: [], 
      source: 'unavailable',
      viewOnline: `https://temp-sms.org/sms/${number}`,
      info: 'Messages could not be retrieved from gateway. You can view them online.' 
    });
  }
};
