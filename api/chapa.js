
const https = require('https');

// Environment Variable: CHAPA_SECRET_KEY
// Get this from your Chapa Dashboard
const CHAPA_KEY = process.env.CHAPA_SECRET_KEY || "CHASECK_TEST-xxxxxxxxxxxxxxxx"; 

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { amount, credits, email, firstName, lastName, tx_ref } = req.body;

  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' });
  }

  // Calculate credits to add. Use passed credits or fallback to estimation (1 credit = 5000 ETB)
  const creditsToAdd = credits ? credits : Math.floor(amount / 5000);

  try {
    // Construct the Return URL (Where Chapa redirects after payment)
    // We append payment_success=true and amount (credits) so App.tsx can detect it
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const origin = `${protocol}://${host}`;
    const returnUrl = `${origin}/?payment_success=true&amount=${creditsToAdd}`; 

    const payload = JSON.stringify({
      amount: amount.toString(),
      currency: 'ETB',
      email: email || 'customer@example.com',
      first_name: firstName || 'Customer',
      last_name: lastName || 'User',
      tx_ref: tx_ref || `TX-${Date.now()}`,
      return_url: returnUrl,
      customization: {
        title: "ConstructAI Credits",
        description: `Payment for ${creditsToAdd} Credits`
      }
    });

    const options = {
      hostname: 'api.chapa.co',
      port: 443,
      path: '/v1/transaction/initialize',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHAPA_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    // Make request to Chapa
    const chapaRequest = https.request(options, (chapaRes) => {
      let data = '';
      chapaRes.on('data', (chunk) => {
        data += chunk;
      });

      chapaRes.on('end', () => {
        const response = JSON.parse(data);
        if (response.status === 'success' && response.data && response.data.checkout_url) {
          res.status(200).json({ success: true, checkout_url: response.data.checkout_url });
        } else {
          res.status(400).json({ success: false, error: response.message || 'Chapa initialization failed' });
        }
      });
    });

    chapaRequest.on('error', (error) => {
      console.error(error);
      res.status(500).json({ error: 'Connection to Chapa failed' });
    });

    chapaRequest.write(payload);
    chapaRequest.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
