
import React from 'react';
import { X, Shield, FileText } from 'lucide-react';

interface ModalProps {
  onClose: () => void;
}

export const TermsModal: React.FC<ModalProps> = ({ onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh]">
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
        <h3 className="text-lg font-bold text-slate-800 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-brand-600" /> Terms of Service
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar text-sm text-slate-600 leading-relaxed space-y-4">
        <p><strong>Effective Date:</strong> March 2025</p>
        <p>Welcome to ConstructAI. By accessing or using our services, you agree to be bound by these Terms of Service.</p>
        
        <h4 className="text-slate-900 font-bold mt-4">1. Services Provided</h4>
        <p>ConstructAI provides AI-powered estimation and quantity surveying tools. These outputs are for estimation purposes only and must be verified by a qualified professional Quantity Surveyor or Engineer before being used for tenders, contracts, or material procurement.</p>

        <h4 className="text-slate-900 font-bold mt-4">2. User Responsibilities</h4>
        <p>You are responsible for the accuracy of the documents you upload. You retain ownership of your data. You must not upload illegal, offensive, or malicious content. ConstructAI is not responsible for errors arising from poor quality drawings or ambiguous specifications.</p>

        <h4 className="text-slate-900 font-bold mt-4">3. Payment & Credits</h4>
        <p>Services are provided on a credit basis (Pay-as-you-go). Credits purchased are non-refundable unless required by applicable law. We use Telebirr and Chapa for secure payment processing and do not store your financial information directly.</p>

        <h4 className="text-slate-900 font-bold mt-4">4. Limitation of Liability</h4>
        <p>ConstructAI Solutions PLC is not liable for construction errors, financial losses, project delays, or material shortages resulting from the use of our estimation tools. The software serves as an aid to professionals, not a replacement.</p>

        <h4 className="text-slate-900 font-bold mt-4">5. Intellectual Property</h4>
        <p>The ConstructAI platform, algorithms, and interface are the property of ConstructAI Solutions PLC. The output documents (Excel/JSON) generated from your data belong to you.</p>

        <h4 className="text-slate-900 font-bold mt-4">6. Termination</h4>
        <p>We reserve the right to suspend accounts that violate these terms, attempt to reverse-engineer the API, or engage in fraudulent payment activities.</p>
      </div>
      <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end">
        <button onClick={onClose} className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Close</button>
      </div>
    </div>
  </div>
);

export const PrivacyModal: React.FC<ModalProps> = ({ onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh]">
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
        <h3 className="text-lg font-bold text-slate-800 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-green-600" /> Privacy Policy
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar text-sm text-slate-600 leading-relaxed space-y-4">
        <p><strong>Last Updated:</strong> March 2025</p>
        <p>Your privacy is critical to us. This policy explains how ConstructAI collects, uses, and protects your information.</p>
        
        <h4 className="text-slate-900 font-bold mt-4">1. Data Collection</h4>
        <p>We collect uploaded documents (PDF, DWG, Images) solely for the purpose of processing your specific estimation request. We also collect basic account information (phone number for Telebirr) to facilitate payments and maintain your credit balance.</p>

        <h4 className="text-slate-900 font-bold mt-4">2. Data Usage</h4>
        <p>Uploaded files are processed in real-time by Google Gemini APIs. We do not use your proprietary construction data to train our public AI models without your explicit consent.</p>

        <h4 className="text-slate-900 font-bold mt-4">3. Data Security</h4>
        <p>Files are transmitted via encrypted SSL/TLS channels. Temporary files used for analysis are automatically deleted from our processing servers after the session expires or upon completion of the analysis.</p>

        <h4 className="text-slate-900 font-bold mt-4">4. Third-Party Services</h4>
        <p>We use trusted third-party providers: Google Cloud (Gemini) for AI processing, Vercel for hosting, and Telebirr/Chapa for payments. Each provider is governed by their own privacy policies.</p>

        <h4 className="text-slate-900 font-bold mt-4">5. Cookies & Local Storage</h4>
        <p>We use local storage on your device to save your credit balance and session preferences. We do not use intrusive tracking cookies for advertising purposes.</p>

        <h4 className="text-slate-900 font-bold mt-4">6. Contact Us</h4>
        <p>For privacy concerns or data deletion requests, please contact us at privacy@construct-ai.com or via WhatsApp at +251 927 94 2534.</p>
      </div>
      <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end">
        <button onClick={onClose} className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Close</button>
      </div>
    </div>
  </div>
);
