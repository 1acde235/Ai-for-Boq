import React, { useState, useEffect } from 'react';
import { ArrowRight, Shield, PlayCircle, BookOpen, MessageCircle, CheckCircle2, Star, UploadCloud, Cpu, FileSpreadsheet, Zap, Layout, HelpCircle, ChevronDown, Check, Briefcase, Ruler, Calculator, Globe } from 'lucide-react';
import { Logo } from './Logo';
import { TermsModal, PrivacyModal } from './LegalModals';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void; 
  onTryDemo: () => void; 
  onOpenGuide: () => void;
}

const BACKGROUND_IMAGES = [
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2089&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1581094794329-cd1361ddee2d?q=80&w=2127&auto=format&fit=crop"  
];

const FAQS = [
  { q: "Is the AI accurate enough for tenders?", a: "Yes. ConstructAI uses the latest Gemini 2.5 Vision models, trained on SMM7 and CESMM4 standards. However, like any tool, we recommend a final human review. The output includes formulas, making it easy to check and adjust." },
  { q: "What file formats do you support?", a: "We support PDF (Vector & Scanned), DWG/DXF (AutoCAD), and High-Res Images (JPG/PNG). You can also upload ZIP files containing multiple drawings." },
  { q: "Do I need a monthly subscription?", a: "No! We operate on a 'Pay-As-You-Go' credit system. You buy credits (via Card or Mobile Money) and use them only when you export a project. Previewing analysis is free." },
  { q: "Does it work for High-Rise buildings?", a: "Absolutely. You can define the number of floors (timesing factor), and the AI will multiply the typical floor quantities automatically." },
];

type Currency = 'USD' | 'EUR' | 'ETB';

const PRICING_TIERS = [
  { 
    title: "Single Project", 
    credits: 1, 
    prices: { USD: 49, EUR: 45, ETB: 5000 },
    features: ["1 Full Project Export", "PDF & DWG Support", "Excel BOQ Download", "7-Day Cloud Storage"] 
  },
  { 
    title: "Starter Pack", 
    credits: 3, 
    popular: true, 
    prices: { USD: 129, EUR: 119, ETB: 20000 },
    features: ["3 Full Project Exports", "Priority Processing", "Rebar Schedule Generation", "30-Day Cloud Storage"] 
  },
  { 
    title: "Pro Bundle", 
    credits: 10, 
    prices: { USD: 399, EUR: 369, ETB: 50000 },
    features: ["10 Full Project Exports", "Team Access", "Dedicated Support", "Unlimited Storage"] 
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin, onTryDemo, onOpenGuide }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currency, setCurrency] = useState<Currency>('USD');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % BACKGROUND_IMAGES.length);
    }, 5000); 

    return () => clearInterval(interval);
  }, []);

  const whatsappUrl = "https://wa.me/251927942534";

  const getPriceDisplay = (prices: { USD: number, EUR: number, ETB: number }) => {
    if (currency === 'USD') return `$${prices.USD}`;
    if (currency === 'EUR') return `€${prices.EUR}`;
    return `${prices.ETB.toLocaleString()} ETB`;
  };

  return (
    <div className="bg-white font-sans relative selection:bg-brand-500 selection:text-white overflow-x-hidden">
      
      {/* FLOATING WHATSAPP BUTTON */}
      <a 
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-50 group flex items-center justify-center"
      >
        <span className="absolute right-16 bg-white text-slate-800 px-3 py-1 rounded-lg shadow-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mr-2 pointer-events-none">
          Chat with Sales
        </span>
        <div className="bg-[#25D366] hover:bg-[#20bd5a] text-white p-4 rounded-full shadow-[0_4px_14px_0_rgba(37,211,102,0.39)] transition-all hover:scale-110 hover:shadow-[0_6px_20px_rgba(37,211,102,0.23)]">
           <MessageCircle className="w-8 h-8 fill-current" />
        </div>
      </a>

      {/* --- HERO SECTION --- */}
      <div className="relative isolate overflow-hidden bg-slate-900 min-h-screen flex flex-col items-center justify-center">
        
        {/* BACKGROUND SLIDESHOW */}
        {BACKGROUND_IMAGES.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 -z-20 h-full w-full transition-opacity duration-1000 ease-in-out ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={img}
              alt={`Background ${index + 1}`}
              className="h-full w-full object-cover opacity-40 transform scale-105"
            />
          </div>
        ))}
        
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-slate-900/60 to-slate-950"></div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-slate-900/10 to-slate-950"></div>

        {/* TOP NAVIGATION (Transparent) */}
        <div className="absolute top-0 left-0 w-full px-6 py-6 flex justify-between items-center z-20 max-w-7xl mx-auto right-0">
            <div className="flex items-center space-x-2">
                 <Logo className="w-8 h-8 text-brand-400" />
                 <span className="text-white font-bold text-xl tracking-tight hidden sm:block">ConstructAI</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={onOpenGuide} className="text-slate-300 hover:text-white text-sm font-medium transition-colors hidden md:block">
                How it Works
              </button>
              <button 
                onClick={onLogin}
                className="px-5 py-2 rounded-full border border-white/20 bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition-all backdrop-blur-sm shadow-lg"
              >
                Client Login
              </button>
            </div>
        </div>

        {/* MAIN HERO CONTENT */}
        <div className="mx-auto max-w-5xl px-6 lg:px-8 relative z-10 w-full flex flex-col items-center text-center mt-[-40px]">
            
            {/* Tagline Badge */}
            <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 backdrop-blur-md text-brand-300 text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(14,165,233,0.3)]">
                 <Star className="w-3 h-3 fill-brand-300" />
                 <span>#1 AI Quantity Surveyor Worldwide</span>
               </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6 drop-shadow-2xl animate-in slide-in-from-bottom-5 duration-700 delay-100 leading-tight">
              Win More Bids.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-cyan-200 to-white">
                Estimate in Seconds.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl leading-8 text-slate-100 mb-10 font-medium max-w-2xl mx-auto animate-in slide-in-from-bottom-5 duration-700 delay-200 drop-shadow-md text-shadow-sm">
              Upload PDF or CAD drawings and get a professional <strong className="text-white">Excel BOQ with Formulas</strong> instantly. Built for Contractors & Consultants Worldwide.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto animate-in slide-in-from-bottom-5 duration-700 delay-300">
              <button 
                onClick={onGetStarted}
                className="w-full sm:w-auto relative group overflow-hidden rounded-full bg-brand-600 px-8 py-4 text-base font-bold text-white shadow-[0_0_40px_rgba(14,165,233,0.4)] hover:bg-brand-500 transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(14,165,233,0.6)]"
              >
                <span className="relative z-10 flex items-center justify-center">
                   Start Free Estimation <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 skew-x-12"></div>
              </button>
              
              <button 
                onClick={onTryDemo}
                className="w-full sm:w-auto flex items-center justify-center px-8 py-4 rounded-full bg-white/10 border border-white/20 text-white font-bold hover:bg-white/20 transition-all backdrop-blur-md shadow-lg"
              >
                <PlayCircle className="ml-2 w-5 h-5 mr-2" />
                See Demo Project
              </button>
            </div>
            
            {/* Feature Pills */}
            <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm font-medium text-slate-300 animate-in fade-in duration-1000 delay-500">
               <div className="flex items-center px-4 py-2 rounded-full bg-black/40 border border-white/10 hover:bg-black/60 transition-colors backdrop-blur-md">
                  <Globe className="w-4 h-4 mr-2 text-brand-400" /> Global Standards
               </div>
               <div className="flex items-center px-4 py-2 rounded-full bg-black/40 border border-white/10 hover:bg-black/60 transition-colors backdrop-blur-md">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-brand-400" /> Auto-Generated Excel
               </div>
               <div className="flex items-center px-4 py-2 rounded-full bg-black/40 border border-white/10 hover:bg-black/60 transition-colors backdrop-blur-md">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-brand-400" /> 99% Accuracy
               </div>
            </div>
        </div>
      </div>

      {/* --- TRUST STRIP --- */}
      <div className="bg-white border-b border-slate-100 py-6">
         <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center md:justify-between items-center gap-6 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Built for Standards:</span>
            <div className="flex items-center gap-2 font-bold text-slate-800"><Briefcase className="w-5 h-5" /> SMM7</div>
            <div className="flex items-center gap-2 font-bold text-slate-800"><Ruler className="w-5 h-5" /> CESMM4</div>
            <div className="flex items-center gap-2 font-bold text-slate-800"><Calculator className="w-5 h-5" /> NRM2</div>
            <div className="h-6 w-px bg-slate-300 hidden md:block"></div>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Integrates with:</span>
            <div className="flex items-center gap-2 font-bold text-blue-600"><FileSpreadsheet className="w-5 h-5" /> Microsoft Excel</div>
            <div className="flex items-center gap-2 font-bold text-green-600"><CheckCircle2 className="w-5 h-5" /> Telebirr & Chapa</div>
         </div>
      </div>

      {/* --- HOW IT WORKS --- */}
      <div className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-black text-slate-900 mb-4">From Drawing to BOQ in Minutes</h2>
            <p className="text-slate-600 max-w-2xl mx-auto mb-16">Stop spending days measuring by hand. Our AI workflow streamlines the process into 3 simple steps.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                {/* Connecting Line (Desktop) */}
                <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-slate-200 via-brand-200 to-slate-200 -z-10"></div>

                {/* Step 1 */}
                <div className="flex flex-col items-center group">
                    <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-slate-100">
                        <UploadCloud className="w-10 h-10 text-brand-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">1. Upload Drawings</h3>
                    <p className="text-sm text-slate-500 leading-relaxed px-4">Drag & drop your PDF, DWG, or Image files. We also accept ZIP files for full project sets.</p>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center group">
                    <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-slate-100 relative">
                         <div className="absolute inset-0 bg-brand-500/5 rounded-2xl animate-pulse"></div>
                        <Cpu className="w-10 h-10 text-brand-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">2. AI Analysis</h3>
                    <p className="text-sm text-slate-500 leading-relaxed px-4">Our Gemini Vision engine identifies walls, columns, beams, and finishes, applying SMM7 logic automatically.</p>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col items-center group">
                    <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-slate-100">
                        <FileSpreadsheet className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">3. Export to Excel</h3>
                    <p className="text-sm text-slate-500 leading-relaxed px-4">Download a fully formatted Excel file with <strong>live formulas</strong>. Ready for pricing and submission.</p>
                </div>
            </div>
        </div>
      </div>

      {/* --- FEATURES GRID --- */}
      <div className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
                  <div className="order-2 lg:order-1 relative">
                       <div className="absolute -inset-4 bg-gradient-to-tr from-brand-100 to-white rounded-3xl blur-2xl opacity-50"></div>
                       <div className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 rotate-1 hover:rotate-0 transition-transform duration-500">
                           {/* Mockup UI */}
                           <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                               <div className="w-3 h-3 rounded-full bg-red-400"></div>
                               <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                               <div className="w-3 h-3 rounded-full bg-green-400"></div>
                           </div>
                           <div className="space-y-3 font-mono text-xs">
                               <div className="flex justify-between p-2 bg-slate-50 rounded"><span>Super Structure: Concrete</span> <span className="font-bold">245.50 m3</span></div>
                               <div className="flex justify-between p-2 bg-white border border-slate-100 rounded"><span>Wall Finishes: Plaster</span> <span className="font-bold">1,204.00 m2</span></div>
                               <div className="flex justify-between p-2 bg-slate-50 rounded"><span>Flooring: Ceramic Tiles</span> <span className="font-bold">850.00 m2</span></div>
                               <div className="flex justify-between p-2 bg-brand-50 border border-brand-100 rounded text-brand-700"><span>Rebar: High Yield Y16</span> <span className="font-bold">12,400 kg</span></div>
                           </div>
                       </div>
                  </div>
                  <div className="order-1 lg:order-2">
                      <div className="inline-block px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-xs font-bold uppercase tracking-wider mb-4">Core Feature</div>
                      <h2 className="text-4xl font-black text-slate-900 mb-6">Automated Quantity Takeoffs</h2>
                      <p className="text-lg text-slate-600 mb-6">Whether it's a simple villa or a high-rise complex, ConstructAI breaks down every element.</p>
                      <ul className="space-y-4">
                          <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-3 mt-0.5" /> <span>Separates Sub-structure vs Super-structure.</span></li>
                          <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-3 mt-0.5" /> <span>Auto-calculates Formwork areas.</span></li>
                          <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-3 mt-0.5" /> <span>Deducts openings (Doors/Windows) from Masonry.</span></li>
                      </ul>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  <div className="order-1 lg:order-1">
                      <div className="inline-block px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold uppercase tracking-wider mb-4">Get Paid Faster</div>
                      <h2 className="text-4xl font-black text-slate-900 mb-6">Payment Certificates</h2>
                      <p className="text-lg text-slate-600 mb-6">Easily generate Interim and Final Payment Certificates by comparing executed work against contract quantities.</p>
                      <ul className="space-y-4">
                          <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-3 mt-0.5" /> <span>Tracks Previous vs Current Quantities.</span></li>
                          <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-3 mt-0.5" /> <span>Automatically calculates Retention & VAT.</span></li>
                          <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-3 mt-0.5" /> <span>Generates "Net Amount Due" in words.</span></li>
                      </ul>
                  </div>
                  <div className="order-2 lg:order-2 relative">
                       <div className="absolute -inset-4 bg-gradient-to-bl from-green-100 to-white rounded-3xl blur-2xl opacity-50"></div>
                       <div className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 -rotate-1 hover:rotate-0 transition-transform duration-500">
                           <div className="font-mono text-xs space-y-4">
                               <div className="border-b pb-2 font-bold text-slate-900 text-sm">PAYMENT CERTIFICATE #04</div>
                               <div className="flex justify-between"><span>Gross Value:</span> <span>4,500,000 ETB</span></div>
                               <div className="flex justify-between text-red-500"><span>Less Retention (5%):</span> <span>-225,000 ETB</span></div>
                               <div className="flex justify-between text-red-500 border-b pb-2 border-slate-100"><span>Less Previous:</span> <span>-1,200,000 ETB</span></div>
                               <div className="flex justify-between text-lg font-bold text-brand-700 pt-2"><span>Net Due:</span> <span>3,075,000 ETB</span></div>
                           </div>
                       </div>
                  </div>
              </div>
          </div>
      </div>

      {/* --- PRICING --- */}
      <div className="py-24 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                  <h2 className="text-3xl font-black mb-4">Transparent, Flexible Pricing</h2>
                  <p className="text-slate-400 mb-8">No subscriptions. No hidden fees. Pay only when you export a project.</p>
                  
                  {/* Currency Toggle */}
                  <div className="inline-flex items-center p-1 bg-slate-800 rounded-lg border border-slate-700">
                      {(['USD', 'EUR', 'ETB'] as Currency[]).map(curr => (
                          <button
                            key={curr}
                            onClick={() => setCurrency(curr)}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                                currency === curr 
                                ? 'bg-brand-600 text-white shadow' 
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                              {curr}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {PRICING_TIERS.map((plan, idx) => (
                      <div key={idx} className={`relative bg-slate-800 rounded-2xl p-8 border ${plan.popular ? 'border-brand-500 shadow-[0_0_30px_rgba(14,165,233,0.2)]' : 'border-slate-700'} flex flex-col`}>
                          {plan.popular && (
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                  Most Popular
                              </div>
                          )}
                          <div className="mb-4">
                              <h3 className="text-lg font-bold">{plan.title}</h3>
                              <div className="flex items-baseline gap-1 mt-2">
                                  <span className="text-4xl font-black animate-in fade-in">
                                      {getPriceDisplay(plan.prices)}
                                  </span>
                              </div>
                              <div className="mt-2 inline-block bg-white/10 px-3 py-1 rounded text-xs font-bold text-brand-300">
                                  {plan.credits} Credits
                              </div>
                          </div>
                          <ul className="space-y-4 mb-8 flex-1">
                              {plan.features.map((feat, fIdx) => (
                                  <li key={fIdx} className="flex items-center text-sm text-slate-300">
                                      <Check className="w-4 h-4 text-green-400 mr-3 flex-shrink-0" /> {feat}
                                  </li>
                              ))}
                          </ul>
                          <button onClick={onLogin} className={`w-full py-3 rounded-xl font-bold transition-all ${plan.popular ? 'bg-brand-600 hover:bg-brand-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
                              Buy Now
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* --- FAQ --- */}
      <div className="py-24 bg-white">
          <div className="max-w-3xl mx-auto px-6">
              <h2 className="text-3xl font-black text-center text-slate-900 mb-12">Frequently Asked Questions</h2>
              <div className="space-y-4">
                  {FAQS.map((faq, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                          <button 
                              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                              className="w-full flex justify-between items-center p-5 text-left bg-slate-50 hover:bg-slate-100 transition-colors"
                          >
                              <span className="font-bold text-slate-800">{faq.q}</span>
                              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                          </button>
                          {openFaq === idx && (
                              <div className="p-5 text-sm text-slate-600 leading-relaxed bg-white border-t border-slate-200 animate-in slide-in-from-top-2">
                                  {faq.a}
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      </div>
      
      {/* Footer / Legal Links */}
       <div className="bg-slate-950 border-t border-slate-900 py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    <Logo className="w-6 h-6 text-slate-600" />
                    <span className="text-white font-bold text-lg">ConstructAI</span>
                </div>
                <p className="text-xs text-slate-500">© 2025 ConstructAI Solutions. Built for the World.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-8">
                <button onClick={() => setShowTerms(true)} className="text-xs text-slate-500 hover:text-brand-400 transition-colors">Terms of Service</button>
                <button onClick={() => setShowPrivacy(true)} className="text-xs text-slate-500 hover:text-brand-400 transition-colors">Privacy Policy</button>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-[#25D366] transition-colors">Support</a>
            </div>
        </div>
      </div>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    </div>
  );
};
