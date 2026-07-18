const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const numberId = req.query.numberId;
  const number = req.query.number;
  
  if (!numberId || !number) {
    return res.status(400).json({ error: "Missing 'numberId' or 'number' query parameter." });
  }

  // Session handler to get cookies and make Ajax request
  const fetchSmsMessages = () => {
    return new Promise((resolve) => {
      // 1. Fetch main page to establish session/cookies
      const options1 = {
        hostname: 'sms-receive.net',
        port: 443,
        path: `/${numberId}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
        },
        timeout: 4000
      };

      const req1 = https.get(options1, (res1) => {
        const cookies = res1.headers['set-cookie'] || [];
        const cookieStr = cookies.map(c => c.split(';')[0]).join('; ');
        
        // 2. Fetch AJAX JSON endpoint using cookies
        const timestamp = Math.round(new Date().getTime() / 1000);
        const options2 = {
          hostname: 'sms-receive.net',
          port: 443,
          path: `/get_sms_register.php?phone=${number}`,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': `https://sms-receive.net/${numberId}`,
            'Cookie': cookieStr,
            'X-Alt-Data': timestamp.toString()
          },
          timeout: 4000
        };

        const req2 = https.get(options2, (res2) => {
          let body = '';
          res2.on('data', (chunk) => body += chunk);
          res2.on('end', () => {
            try {
              const rawData = JSON.parse(body);
              const messages = (rawData || []).map(msg => ({
                sender: msg.telefon || 'Unknown',
                text: msg.mesaj || '',
                time: msg.data || 'Received'
              }));
              resolve({ status: 'ok', messages });
            } catch (e) {
              resolve({ status: 'parse_fail', error: e.message });
            }
          });
        });
        req2.on('error', (e) => resolve({ status: 'error', error: e.message }));
        req2.on('timeout', () => { req2.destroy(); resolve({ status: 'timeout' }); });
      });
      req1.on('error', (e) => resolve({ status: 'error', error: e.message }));
      req1.on('timeout', () => { req1.destroy(); resolve({ status: 'timeout' }); });
    });
  };

  const result = await fetchSmsMessages();

  if (result.status === 'ok') {
    return res.status(200).json({ 
      messages: result.messages, 
      source: 'live' 
    });
  } else {
    return res.status(200).json({ 
      messages: [], 
      source: 'unavailable',
      viewOnline: `https://sms-receive.net/${numberId}`,
      info: `Could not retrieve live messages: ${result.error || result.status}` 
    });
  }
};
