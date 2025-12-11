
import https from 'https';

export default async function handler(req, res) {
  // Debug Log
  console.log(`[Chapa API] Request received: ${req.method}`);

  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. CHECK API KEY
  const CHAPA_KEY = process.env.CHAPA_SECRET_KEY;
  if (!CHAPA_KEY) {
      console.error("[Chapa API] Error: CHAPA_SECRET_KEY is missing in Vercel Environment Variables.");
      return res.status(500).json({ error: "Server Error: CHAPA_SECRET_KEY is not configured." });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
      const { amount, credits, email, firstName, lastName, tx_ref } = req.body || {};

      if (!amount) {
        return res.status(400).json({ error: 'Amount is required' });
      }

      // Calculate credits
      const creditsToAdd = credits ? credits : Math.floor(Number(amount) / 5000);

      // Construct Return URL
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const origin = host ? `${protocol}://${host}` : 'https://construct-ai.com';
      const returnUrl = `${origin}/?payment_success=true&amount=${creditsToAdd}`; 

      // Prepare Payload
      const payload = JSON.stringify({
        amount: amount.toString(),
        currency: 'ETB',
        email: email || 'guest@construct-ai.com',
        first_name: firstName || 'Guest',
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
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      console.log(`[Chapa API] Sending request to Chapa... (${options.hostname})`);

      // 2. MAKE HTTPS REQUEST (Native Node)
      const response = await new Promise((resolve, reject) => {
        const apiReq = https.request(options, (apiRes) => {
          let data = '';
          apiRes.on('data', (chunk) => {
            data += chunk;
          });
          apiRes.on('end', () => {
            resolve({
              statusCode: apiRes.statusCode,
              body: data
            });
          });
        });

        apiReq.on('error', (e) => {
          reject(e);
        });

        apiReq.write(payload);
        apiReq.end();
      });

      console.log(`[Chapa API] Response Status: ${response.statusCode}`);

      // 3. PARSE RESPONSE
      let result;
      try {
          result = JSON.parse(response.body);
      } catch (e) {
          console.error("[Chapa API] Failed to parse JSON response:", response.body);
          return res.status(502).json({ error: "Invalid response from Payment Gateway (Not JSON)" });
      }

      if (response.statusCode !== 200 || result.status !== 'success') {
          console.error("[Chapa API] Gateway Error:", result);
          return res.status(400).json({ 
              success: false, 
              error: result.message || "Payment initialization failed",
              details: result
          });
      }

      return res.status(200).json({ success: true, checkout_url: result.data.checkout_url });

  } catch (err) {
      console.error("[Chapa API] Internal Exception:", err);
      return res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
}
