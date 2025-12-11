
import React from 'react';
import { ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';

interface DisclaimerModalProps {
  onAccept: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border-t-4 border-amber-500">
        
        <div className="p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="bg-amber-100 p-3 rounded-full">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Professional Disclaimer</h2>
          </div>

          <div className="space-y-4 text-sm text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            <p>
              <strong>ConstructAI</strong> utilizes advanced Artificial Intelligence (Google Gemini 2.5) to assist in generating Quantity Takeoffs and Bills of Quantities.
            </p>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800 flex items-center">
                <ShieldAlert className="w-4 h-4 mr-2 text-slate-500" />
                Key Limitations
              </h4>
              <ul className="list-disc list-inside space-y-1 ml-1 text-slate-600">
                <li>AI estimates may contain errors in geometry or interpretation.</li>
                <li>Visual analysis (PDF/Image) depends on drawing clarity.</li>
                <li>DWG Analysis provides estimated modeling based on grid logic.</li>
              </ul>
            </div>

            <p className="font-bold text-slate-800">
              By continuing, you acknowledge and agree that:
            </p>
            <ul className="list-decimal list-inside space-y-2 pl-2">
              <li>This software is an <strong>estimation aid</strong>, not a substitute for a professional Quantity Surveyor.</li>
              <li>You are solely responsible for <strong>verifying all dimensions, quantities, and descriptions</strong> before using them for tenders, contracts, or material ordering.</li>
              <li>ConstructAI Solutions PLC accepts <strong>no liability</strong> for financial losses due to under/over-estimation.</li>
            </ul>
          </div>
        </div>

        <div className="bg-slate-50 px-8 py-6 border-t border-slate-200 flex justify-end">
          <button 
            onClick={onAccept}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center transition-all hover:scale-105 shadow-lg"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            I Understand & Accept Risk
          </button>
        </div>
      </div>
    </div>
  );
};
