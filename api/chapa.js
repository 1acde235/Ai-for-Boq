
export default async function handler(req, res) {
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

  // Get Key
  const CHAPA_KEY = process.env.CHAPA_SECRET_KEY;
  if (!CHAPA_KEY) {
      console.error("CRITICAL: CHAPA_SECRET_KEY is missing in Environment Variables.");
      return res.status(500).json({ error: "Payment configuration missing on server." });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
      const { amount, credits, email, firstName, lastName, tx_ref } = req.body || {};

      if (!amount) {
        return res.status(400).json({ error: 'Amount is required' });
      }

      // 1 Credit = 5000 ETB (Default)
      const creditsToAdd = credits ? credits : Math.floor(Number(amount) / 5000);

      // Construct Return URL
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const origin = `${protocol}://${host}`;
      const returnUrl = `${origin}/?payment_success=true&amount=${creditsToAdd}`; 

      const payload = {
        amount: amount.toString(),
        currency: 'ETB',
        email: email || 'saynotoracism124@gmail.com',
        first_name: firstName || 'Amanuel',
        last_name: lastName || 'User',
        tx_ref: tx_ref || `TX-${Date.now()}`,
        return_url: returnUrl,
        customization: {
          title: "ConstructAI Credits",
          description: `Payment for ${creditsToAdd} Credits`
        }
      };

      console.log("Sending request to Chapa...");

      // Use Node.js native fetch (Node 18+)
      const chapaRes = await fetch('https://api.chapa.co/v1/transaction/initialize', {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${CHAPA_KEY}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
      });

      const data = await chapaRes.json();

      if (!chapaRes.ok) {
          console.error("Chapa API Failed:", data);
          return res.status(400).json({ 
              success: false, 
              error: data.message || "Chapa initialization failed" 
          });
      }

      console.log("Chapa initialized successfully");
      return res.status(200).json({ success: true, checkout_url: data.data.checkout_url });

  } catch (err) {
      console.error("Chapa Handler Exception:", err);
      return res.status(500).json({ error: "Internal Server Error during payment initialization." });
  }
}
