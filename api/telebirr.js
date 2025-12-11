
// This file acts as a Vercel Serverless Function (Backend)
import crypto from 'crypto';
import https from 'https';

// --- CONFIGURATION ---
const APP_ID = process.env.TELEBIRR_APP_ID;
const APP_KEY = process.env.TELEBIRR_APP_KEY; 
const SHORT_CODE = process.env.TELEBIRR_SHORT_CODE;
const NOTIFY_URL = "https://your-domain.com/api/telebirr-callback"; 
const TELEBIRR_API_URL = "https://app.ethiotelecom.et/telebirr/api/pay";

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
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // --- SIMULATION MODE (If keys are not set in Vercel/Env) ---
  if (!APP_ID || APP_ID === "YOUR_APP_ID" || !APP_KEY) {
    console.log("Telebirr Keys missing. Running in Simulation Mode.");
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return res.status(200).json({
       success: true,
       message: "Simulation: Payment Initiated Successfully",
       // In simulation, we don't return a redirect URL, triggering the frontend to show the USSD alert
    });
  }

  const { phoneNumber, amount, subject } = req.body;

  if (!phoneNumber || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Prepare the Payload
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const outTradeNo = `ORDER_${timestamp}_${Math.floor(Math.random() * 1000)}`;

    const payload = {
      appId: APP_ID,
      appKey: APP_KEY,
      nonce: nonce,
      notifyUrl: NOTIFY_URL,
      outTradeNo: outTradeNo,
      returnUrl: "https://your-domain.com/?payment_success=true",
      shortCode: SHORT_CODE,
      subject: subject || "ConstructAI Credits",
      timeoutExpress: "30", // Minutes
      timestamp: timestamp,
      totalAmount: amount.toString(),
      receiveName: "ConstructAI Inc"
    };

    // 2. Generate Signature
    const sortedKeys = Object.keys(payload).sort();
    let stringToSign = "";
    for (const key of sortedKeys) {
      if (key !== "sign" && payload[key]) {
        stringToSign += `${key}=${payload[key]}&`;
      }
    }
    stringToSign = stringToSign.slice(0, -1);

    const sign = crypto.createSign('SHA256');
    sign.update(stringToSign);
    sign.end();
    
    // Check if APP_KEY is PEM formatted, if not, handle accordingly.
    // Assuming standard PEM here.
    const signature = sign.sign(APP_KEY, 'base64');
    
    const finalPayload = {
      ...payload,
      sign: signature,
      ussd: JSON.stringify({ "phone": phoneNumber }) 
    };

    // 3. Send to Telebirr API
    // Using native https module to avoid external dependencies like node-fetch in basic environment
    const makeRequest = (url, data) => {
      return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch(e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
      });
    };

    const telebirrData = await makeRequest(TELEBIRR_API_URL, finalPayload);

    // 4. Return result
    if (telebirrData.code === 200 || telebirrData.code === "200") {
        return res.status(200).json({ 
            success: true, 
            toPayUrl: telebirrData.data?.toPayUrl, 
            message: "Payment initiated"
        });
    } else {
        return res.status(500).json({ error: telebirrData.msg || "Payment gateway error" });
    }

  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
