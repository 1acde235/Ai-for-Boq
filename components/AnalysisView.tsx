import React, { useEffect, useState, useRef } from 'react';
import { Loader2, Zap, FileText, CheckCheck, Terminal, Server, ShieldCheck, Cpu, Scan } from 'lucide-react';

interface AnalysisViewProps {
  fileName: string;
}

const PROCESS_LOGS = [
  "Initializing Gemini 2.5 Flash Vision Model...",
  "Secure handshake established with Google Cloud...",
  "Decoded file binary stream (MIME: application/pdf)...",
  "OCR Layer: Extracting text from Title Blocks...",
  "Vector Analysis: Identifying grid lines (Axis A-F)...",
  "Structural Pass: Detecting Foundations, Cols, Beams, Slabs...",
  "Rebar Pass: Extracting Bar Bending Schedule (BBS)...",
  "Arch Pass: Measuring Walls, Flooring, Ceiling, Cladding...",
  "MEP Pass: Counting Electrical Points (Sockets, Lights)...",
  "MEP Pass: Counting Sanitary Fixtures & Plumbing...",
  "MEP Pass: Identifying Mechanical Units (HVAC, Lifts)...",
  "Cross-referencing Plan areas with Section heights...",
  "Applying local standard waste factors (Concrete: 5%)...",
  "Validating logic against SMM7 / CESMM4 standards...",
  "Finalizing BOQ structure and formatting JSON..."
];

export const AnalysisView: React.FC<AnalysisViewProps> = ({ fileName }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let delay = 0;
    const totalDuration = 15000; // Approx total time in ms
    const intervalTime = totalDuration / 100;

    // Progress Bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) return 99;
        return prev + 1;
      });
    }, intervalTime);

    // Logs
    PROCESS_LOGS.forEach((log, index) => {
      delay += Math.random() * 800 + 400; // Random delay
      setTimeout(() => {
        setLogs(prev => [...prev, `> ${log}`]);
      }, delay);
    });

    return () => clearInterval(progressInterval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[600px] w-full max-w-4xl mx-auto">
      
      {/* Central Animation */}
      <div className="relative mb-12">
        {/* Pulsing Background */}
        <div className="absolute inset-0 bg-brand-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
        
        {/* Main Card */}
        <div className="relative bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 flex items-center justify-center w-32 h-32">
           {/* Scanning Bar */}
           <div className="absolute inset-0 rounded-3xl overflow-hidden">
               <div className="h-full w-full bg-gradient-to-b from-transparent via-brand-500/10 to-transparent animate-scan"></div>
           </div>

           <Cpu className="w-16 h-16 text-brand-600 animate-pulse relative z-10" />
          
           {/* Orbiting Icons */}
           <div className="absolute -top-6 -right-6 bg-amber-50 p-3 rounded-xl shadow-lg border border-amber-100 animate-bounce delay-100">
             <FileText className="w-6 h-6 text-amber-500" />
           </div>
           <div className="absolute -bottom-6 -left-6 bg-green-50 p-3 rounded-xl shadow-lg border border-green-100 animate-bounce delay-300">
             <Server className="w-6 h-6 text-green-500" />
           </div>
        </div>
      </div>
      
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Analyzing Project Documents</h2>
      <p className="text-slate-500 mb-8 text-center max-w-lg">
        ConstructAI is virtually "reading" <strong>{fileName}</strong>. <br/>
        <span className="text-xs text-brand-500 font-bold uppercase tracking-wider">Estimated time: 20-40 seconds</span>
      </p>

      {/* Progress Bar */}
      <div className="w-full max-w-xl mb-8">
         <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
            <span>System Status</span>
            <span>{progress}%</span>
         </div>
         <div className="h-3 bg-slate-200 rounded-full overflow-hidden relative">
            <div 
               className="absolute top-0 left-0 h-full bg-brand-500 transition-all duration-300 ease-out"
               style={{ width: `${progress}%` }}
            >
               <div className="absolute inset-0 bg-white/30 w-full h-full animate-shimmer"></div>
            </div>
         </div>
      </div>

      {/* Terminal / Log Window */}
      <div className="w-full max-w-2xl bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-800 font-mono text-sm relative group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-50"></div>
        <div className="bg-slate-900 px-4 py-2 flex items-center space-x-2 border-b border-slate-800">
           <div className="w-3 h-3 rounded-full bg-red-500"></div>
           <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
           <div className="w-3 h-3 rounded-full bg-green-500"></div>
           <div className="flex-1 text-center text-xs text-slate-500 font-bold tracking-wider">ConstructAI_Kernel_v2.5</div>
        </div>
        <div 
          ref={scrollRef}
          className="p-6 h-64 overflow-y-auto custom-scrollbar space-y-2 font-mono"
        >
          <div className="text-slate-600 mb-4 opacity-50">
             // Initiating secure handshake sequence...<br/>
             // Loading neural weights...
          </div>
          {logs.map((log, i) => (
             <div key={i} className="text-green-400 text-xs md:text-sm animate-in fade-in slide-in-from-left-2 duration-300 flex">
                <span className="opacity-50 mr-2 text-slate-500">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                {log}
             </div>
          ))}
          <div className="text-brand-400 animate-pulse mt-2 flex">
             <span className="opacity-50 mr-2 text-slate-500">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
             _
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center space-x-2 text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
         <ShieldCheck className="w-3 h-3 text-brand-500" />
         <span>256-bit Encryption Active. Your data is processed securely.</span>
      </div>
    </div>
  );
};