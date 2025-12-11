
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, User, Bot, Loader2, ArrowRight } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export const ChatSupport: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: "Hi! I'm the ConstructAI assistant. I can help you with pricing, how to upload drawings, or understanding our features. How can I help?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const WHATSAPP_NUMBER = "251927942534";
  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}`;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemPrompt = `
        You are the AI Sales & Support Agent for "ConstructAI", a SaaS for Quantity Surveying Worldwide.
        
        **YOUR KNOWLEDGE BASE:**
        1. **What we do:** We use AI (Gemini Vision) to analyze construction drawings (PDF, DWG, Images) and auto-generate Excel Bill of Quantities (BOQ) with formulas.
        2. **Features:** 
           - Supports SMM7, CESMM4, NRM2 standards.
           - Generates Payment Certificates (Interim/Final).
           - Creates Rebar Schedules (BS 8666).
           - Works for High-Rise (using 'timesing' factor) and Low-Rise.
        3. **Pricing (Pay-As-You-Go Credit System):**
           - **Single Project:** 5,000 ETB or equivalent (1 Credit).
           - **Starter Pack:** 20,000 ETB or equivalent (3 Credits).
           - **Pro Bundle:** 50,000 ETB or equivalent (10 Credits).
           - Payment Methods: Telebirr, CBE, Bank Transfer, International Cards.
        
        **YOUR GOAL:**
        - Answer user questions briefly and professionally.
        - If the user asks about buying credits, payment issues, or complex engineering advice, **tell them to contact our human team on WhatsApp** and provide the link.
        - If the user asks "How do I pay?", explain the manual transfer or Telebirr option and guide them to WhatsApp for verification.
        
        **TONE:** Professional, helpful, concise.
      `;

      // Construct history for context
      const history = messages.map(m => `root: ${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
      const fullPrompt = `${history}\nUser: ${userMsg}\nAssistant:`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 300,
        }
      });

      const aiText = response.text || "I'm having trouble connecting right now. Please try WhatsApp.";
      setMessages(prev => [...prev, { role: 'model', text: aiText }]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm currently offline. Please contact human support on WhatsApp." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openWhatsApp = () => {
    window.open(whatsappLink, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end print:hidden font-sans">
      
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white w-[350px] md:w-[400px] h-[500px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300 mb-4">
          
          {/* Header */}
          <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
            <div className="flex items-center space-x-2">
              <div className="bg-brand-500 p-1.5 rounded-full">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold">ConstructAI Support</h3>
                <div className="flex items-center text-[10px] text-green-400">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                  Online
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-brand-600 text-white rounded-br-none' 
                    : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-3 shadow-sm">
                   <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Quick Action: WhatsApp */}
          <div className="bg-slate-50 px-4 pb-2">
              <button 
                onClick={openWhatsApp}
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center transition-colors shadow-sm"
              >
                Chat with Human Agent on WhatsApp <ArrowRight className="w-3 h-3 ml-2" />
              </button>
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-200">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask about pricing or features..."
                className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none placeholder:text-slate-400"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-14 h-14 bg-brand-600 hover:bg-brand-500 text-white rounded-full shadow-[0_4px_14px_0_rgba(14,165,233,0.39)] transition-all hover:scale-105 active:scale-95"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6 fill-current" />}
        
        {/* Notification Badge if closed */}
        {!isOpen && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></span>
        )}
      </button>
    </div>
  );
};
