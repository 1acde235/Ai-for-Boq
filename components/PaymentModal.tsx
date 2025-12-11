
import React, { useState, useEffect } from 'react';
import { X, CreditCard, ShieldCheck, Smartphone, Loader2, Landmark, Copy, Check, Ticket, ArrowRight, Globe } from 'lucide-react';

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: (creditsAdded: number) => void;
  onRedeem: (code: string) => boolean; 
  initialCode?: string; 
}

type PaymentMethod = 'chapa' | 'manual_telebirr' | 'bank';
type Currency = 'USD' | 'EUR' | 'ETB';

interface Plan {
    id: string;
    name: string;
    credits: number;
    prices: {
        USD: number;
        EUR: number;
        ETB: number;
    };
    popular?: boolean;
}

const PLANS: Plan[] = [
    { id: 'single', name: 'Single Project', credits: 1, prices: { USD: 49, EUR: 45, ETB: 5000 } },
    { id: 'starter', name: 'Starter Pack', credits: 3, prices: { USD: 129, EUR: 119, ETB: 20000 } },
    { id: 'pro', name: 'Pro Bundle', credits: 10, prices: { USD: 399, EUR: 369, ETB: 50000 }, popular: true }
];

export const PaymentModal: React.FC<PaymentModalProps> = ({ onClose, onSuccess, onRedeem, initialCode }) => {
  const [processing, setProcessing] = useState<boolean>(false);
  const [method, setMethod] = useState<PaymentMethod>('chapa');
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[1]);
  const [currency, setCurrency] = useState<Currency>('USD');
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemError, setRedeemError] = useState<string|null>(null);

  useEffect(() => {
    const randomRef = 'CST-' + Math.floor(1000 + Math.random() * 9000);
    setReferenceId(randomRef);
  }, []);

  useEffect(() => {
     if (initialCode) {
         setRedeemCode(initialCode);
         // Attempt auto-redeem after a short delay to allow render
         const timer = setTimeout(() => {
             const success = onRedeem(initialCode);
             if (success) {
                 onClose();
             } else {
                 setRedeemError("Code auto-applied. If invalid, please try another.");
             }
         }, 500);
         return () => clearTimeout(timer);
     }
  }, [initialCode, onRedeem, onClose]);

  const ADMIN_PHONE = "+251927942534"; 

  const BANK_DETAILS = {
    bankName: "Dashen Bank",
    accountName: "ConstructAI Solutions PLC",
    accountNumber: "5254594083011",
    swiftCode: "DASHETAA",
    adminPhone: ADMIN_PHONE
  };
  
  const TELEBIRR_DETAILS = {
      merchantName: "ConstructAI Solutions",
      merchantNumber: ADMIN_PHONE.replace('+251', '0'),
      adminPhone: ADMIN_PHONE
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFormattedPrice = (plan: Plan) => {
      if (currency === 'USD') return `$${plan.prices.USD}`;
      if (currency === 'EUR') return `€${plan.prices.EUR}`;
      return `${plan.prices.ETB.toLocaleString()} ETB`;
  };

  const handleBuy = async () => {
    setError(null);
    setProcessing(true);

    try {
      const price = selectedPlan.prices[currency];
      const credits = selectedPlan.credits;

      // ------------------------------------------------------------------
      // CHAPA (CARDS & MOBILE MONEY)
      // ------------------------------------------------------------------
      if (method === 'chapa') {
          try {
              // We send the ETB equivalent to Chapa as it is the primary currency for the gateway
              const amountToSend = selectedPlan.prices.ETB; 

              const response = await fetch('/api/chapa', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                      amount: amountToSend,
                      credits: credits, 
                      tx_ref: referenceId,
                      currency: 'ETB', 
                      email: 'guest@construct-ai.com', 
                      firstName: 'Guest',
                      lastName: 'User'
                  }),
              });

              const data = await response.json();

              if (data.success && data.checkout_url) {
                  window.location.href = data.checkout_url;
              } else {
                  throw new Error(data.error || "Failed to initialize Chapa payment");
              }
          } catch (apiErr) {
             console.error(apiErr);
             throw new Error("Could not connect to payment gateway.");
          }
          return;
      }

      // ------------------------------------------------------------------
      // MANUAL BANK TRANSFER FLOW
      // ------------------------------------------------------------------
      if (method === 'bank') {
         const message = encodeURIComponent(
            `Hello, I have sent ${getFormattedPrice(selectedPlan)} to your ${BANK_DETAILS.bankName} account for the ${credits} Credits package.\n\n` +
            `My Payment Reference ID is: ${referenceId}\n\n` +
            `Please verify and send me a redemption code.`
         );
         const whatsappUrl = `https://wa.me/${BANK_DETAILS.adminPhone.replace('+', '')}?text=${message}`;
         
         window.open(whatsappUrl, '_blank');
         
         setProcessing(false);
         alert("WhatsApp opened! Please send the message to the Admin. Once verified, you will receive a code to enter below.");
         return;
      }

      // ------------------------------------------------------------------
      // MANUAL TELEBIRR FLOW
      // ------------------------------------------------------------------
      if (method === 'manual_telebirr') {
        if (phoneNumber.length < 9) {
          throw new Error("Please enter your SENDER phone number for verification.");
        }

        const message = encodeURIComponent(
            `Hello, I have sent ${selectedPlan.prices.ETB.toLocaleString()} ETB via Telebirr.\n\n` +
            `SENDER PHONE: ${phoneNumber}\n` +
            `PACKAGE: ${credits} Credits (${selectedPlan.name})\n\n` +
            `Please verify and send me a redemption code.`
        );

        const whatsappUrl = `https://wa.me/${TELEBIRR_DETAILS.adminPhone.replace('+', '')}?text=${message}`;
        window.open(whatsappUrl, '_blank');

        setProcessing(false);
        alert(`Step 1 Complete!\n\nNow send the pre-filled message on WhatsApp to the Admin.\n\nOnce they verify your transfer, they will send you a Code to enter at the bottom of this screen.`);
        return;
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Payment processing failed");
      setProcessing(false);
    }
  };

  const handleRedeemSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setRedeemError(null);
      if (!redeemCode.trim()) return;

      const success = onRedeem(redeemCode.trim());
      if (success) {
          onClose();
      } else {
          setRedeemError("Invalid or expired code.");
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Top Up Wallet</h3>
            <div className="flex items-center space-x-2 mt-1">
                 <p className="text-xs text-slate-500">Secure Payment Gateway</p>
                 <span className="text-slate-300">|</span>
                 <div className="flex space-x-1">
                     {(['USD', 'EUR', 'ETB'] as Currency[]).map(c => (
                         <button 
                            key={c}
                            onClick={() => setCurrency(c)}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${currency === c ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                         >
                            {c}
                         </button>
                     ))}
                 </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* 1. SELECT PLAN */}
          <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">1. Select Package</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PLANS.map(plan => (
                      <div 
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`relative cursor-pointer border rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all ${
                            selectedPlan.id === plan.id 
                            ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' 
                            : 'border-slate-200 hover:border-brand-300 hover:shadow-md'
                        }`}
                      >
                          {plan.popular && (
                              <div className="absolute -top-2 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">POPULAR</div>
                          )}
                          <div className="text-2xl font-bold text-slate-800">{plan.credits}</div>
                          <div className="text-[10px] text-slate-500 uppercase font-bold">Credits</div>
                          <div className="mt-2 text-sm font-bold text-brand-700 animate-in fade-in">
                              {getFormattedPrice(plan)}
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* 2. SELECT METHOD */}
          <div className="mb-6">
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">2. Select Payment Method</h4>
             <div className="grid grid-cols-3 gap-2">
                 <button 
                   onClick={() => setMethod('chapa')}
                   className={`py-3 px-1 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                     method === 'chapa' 
                       ? 'border-green-500 bg-green-50 text-green-700' 
                       : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                   }`}
                 >
                   <CreditCard className="w-4 h-4 mb-1" />
                   <span className="text-[9px] font-bold">Chapa</span>
                   <span className="text-[7px] text-slate-400 leading-none mt-0.5">Cards / Mobile</span>
                 </button>

                 <button 
                   onClick={() => setMethod('manual_telebirr')}
                   className={`py-3 px-1 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                     method === 'manual_telebirr' 
                       ? 'border-slate-700 bg-slate-50 text-slate-900' 
                       : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                   }`}
                 >
                   <Smartphone className="w-4 h-4 mb-1" />
                   <span className="text-[9px] font-bold">Manual</span>
                   <span className="text-[7px] text-slate-400 leading-none mt-0.5">Telebirr</span>
                 </button>

                 <button 
                   onClick={() => setMethod('bank')}
                   className={`py-3 px-1 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                     method === 'bank' 
                       ? 'border-slate-700 bg-slate-50 text-slate-900' 
                       : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                   }`}
                 >
                   <Landmark className="w-4 h-4 mb-1" />
                   <span className="text-[9px] font-bold">Bank</span>
                   <span className="text-[7px] text-slate-400 leading-none mt-0.5">Transfer</span>
                 </button>
             </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start animate-in fade-in">
               <ShieldCheck className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
               {error}
            </div>
          )}

          {/* MANUAL TELEBIRR FORM */}
          {method === 'manual_telebirr' && (
             <div className="mb-6 animate-in slide-in-from-top-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-600 mb-4">
                    <p className="font-bold mb-1">Instruction:</p>
                    1. Send <span className="font-bold text-slate-900">{selectedPlan.prices.ETB.toLocaleString()} ETB</span> to <span className="font-mono font-bold text-slate-900 bg-slate-200 px-1 rounded">{TELEBIRR_DETAILS.merchantNumber}</span><br/>
                    2. Enter your phone number below.<br/>
                    3. Click "Complete Payment" to verify via WhatsApp.
                </div>
                
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Your Phone Number</label>
                <div className="relative">
                   <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">+251</div>
                   <input 
                      type="tel"
                      placeholder="911 234 567"
                      className="w-full pl-14 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                   />
                </div>
             </div>
          )}

          {/* BANK TRANSFER DETAILS */}
          {method === 'bank' && (
             <div className="mb-6 animate-in slide-in-from-top-2 bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Transfer Details</h4>
                <div className="space-y-3 text-sm">
                   <div className="flex justify-between">
                      <span className="text-slate-500">Bank Name</span>
                      <span className="font-medium text-slate-900">{BANK_DETAILS.bankName}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-slate-500">Account Name</span>
                      <span className="font-medium text-slate-900">{BANK_DETAILS.accountName}</span>
                   </div>
                   <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                      <span className="font-mono text-slate-700 font-bold">{BANK_DETAILS.accountNumber}</span>
                      <button onClick={() => copyToClipboard(BANK_DETAILS.accountNumber)} className="text-brand-600 hover:text-brand-800">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                   </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200">
                   <label className="block text-xs font-bold text-amber-600 mb-1">PAYMENT REFERENCE (REQUIRED)</label>
                   <div className="bg-amber-50 border border-amber-200 p-2 rounded flex justify-between items-center">
                       <span className="font-mono font-bold text-slate-800">{referenceId}</span>
                       <span className="text-[10px] text-amber-700 italic">Send this to admin</span>
                   </div>
                </div>
             </div>
          )}
          
          {/* Action Button */}
          <button 
            onClick={handleBuy}
            disabled={processing}
            className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center ${
                method === 'chapa' ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20' : 
                'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'
            }`}
          >
            {processing ? (
               <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
               <>
                 {method === 'chapa' ? 'Pay with Chapa' : 'Verify via WhatsApp'}
                 <ArrowRight className="w-4 h-4 ml-2" />
               </>
            )}
          </button>
        </div>

        {/* REDEMPTION FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 p-4">
            <form onSubmit={handleRedeemSubmit}>
               <div className="flex items-center justify-between mb-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Have a Redemption Code?</label>
                   {redeemError && <span className="text-[10px] text-red-500 font-bold">{redeemError}</span>}
               </div>
               <div className="flex space-x-2">
                   <div className="relative flex-1">
                       <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <input 
                          type="text" 
                          placeholder="Enter Code (e.g. CST-5000...)" 
                          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-brand-500 focus:border-brand-500 uppercase"
                          value={redeemCode}
                          onChange={(e) => setRedeemCode(e.target.value)}
                       />
                   </div>
                   <button 
                      type="submit"
                      className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-4 rounded-lg text-sm transition-colors"
                   >
                      Redeem
                   </button>
               </div>
            </form>
        </div>

      </div>
    </div>
  );
};
