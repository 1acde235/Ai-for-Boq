
import React, { useState, useEffect, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { AnalysisView } from './components/AnalysisView';
import { ResultsView } from './components/ResultsView';
import { InstructionView } from './components/InstructionView';
import { PaymentModal } from './components/PaymentModal'; 
import { LandingPage } from './components/LandingPage';
import { DisclaimerModal } from './components/DisclaimerModal';
import { DashboardView } from './components/DashboardView'; 
import { TutorialModal } from './components/TutorialModal';
import { ChatSupport } from './components/ChatSupport'; // NEW IMPORT
import { generateTakeoff, FileInput } from './services/geminiService';
import { AppState, TakeoffResult, UploadedFile, AppMode } from './types';
import { Wallet, CheckCircle, Phone, Shield, FileText, Mail, Calculator, FileCheck, ArrowRight, ChevronLeft, BookOpen } from 'lucide-react';
import { Logo } from './components/Logo';
import JSZip from 'jszip';

// ----------------------------------------------------------------------
// SECURITY CONFIGURATION
// ----------------------------------------------------------------------
const COUPON_SALT = "CONSTRUCT-AI-SECURE-HASH-V1";

const App: React.FC = () => {
  // START AT LANDING PAGE
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [appMode, setAppMode] = useState<AppMode>(AppMode.ESTIMATION);
  
  // FILES STATE (Now Supports Multiple)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]); 
  const [specFile, setSpecFile] = useState<UploadedFile | null>(null);
  const [contractFile, setContractFile] = useState<UploadedFile | null>(null);
  
  // USER STATE (Credits) - PERSISTENT WALLET
  const [credits, setCredits] = useState(() => {
    const saved = localStorage.getItem('constructAi_credits');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Track Used Codes
  const [usedCodes, setUsedCodes] = useState<string[]>(() => {
    const saved = localStorage.getItem('constructAi_usedCodes');
    return saved ? JSON.parse(saved) : [];
  });

  // Saved Projects (Persistence)
  const [savedProjects, setSavedProjects] = useState<TakeoffResult[]>(() => {
    const saved = localStorage.getItem('constructAi_projects');
    return saved ? JSON.parse(saved) : [];
  });

  // Disclaimer Acceptance
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(() => {
    return localStorage.getItem('constructAi_disclaimer') === 'true';
  });

  // Custom Admin Codes
  const [customCodes, setCustomCodes] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('constructAi_customCodes');
    const defaults = { 
      'MYDREAM..123': 3, 
    }; 
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults; 
  });

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('constructAi_credits', credits.toString());
  }, [credits]);

  useEffect(() => {
    localStorage.setItem('constructAi_usedCodes', JSON.stringify(usedCodes));
  }, [usedCodes]);

  useEffect(() => {
    localStorage.setItem('constructAi_customCodes', JSON.stringify(customCodes));
  }, [customCodes]);

  // Persist Projects
  useEffect(() => {
    localStorage.setItem('constructAi_projects', JSON.stringify(savedProjects));
  }, [savedProjects]);

  const handleDisclaimerAccept = () => {
    setHasAcceptedDisclaimer(true);
    localStorage.setItem('constructAi_disclaimer', 'true');
  };

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false); // NEW STATE
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-fill code for modal
  const [initialRedeemCode, setInitialRedeemCode] = useState<string>('');

  // Stores the ACCUMULATED Result
  const [takeoffData, setTakeoffData] = useState<TakeoffResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Flag to track if we are adding to existing data or starting fresh
  const [isMerging, setIsMerging] = useState(false);

  // Prevent double-processing in Strict Mode
  const processedRef = useRef(false);

  // ------------------------------------------------------------
  // DATA LOSS PREVENTION
  // ------------------------------------------------------------
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (appState === AppState.RESULTS) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [appState]);

  // ------------------------------------------------------------
  // CRYPTOGRAPHIC COUPON LOGIC (Stateless Verification)
  // ------------------------------------------------------------
  const verifySignedCode = (code: string): number | null => {
    try {
      const parts = code.split('-');
      if (parts.length !== 4) return null;
      if (parts[0] !== 'CST') return null;

      const amount = parseInt(parts[1]);
      const random = parts[2];
      const providedSig = parts[3];

      const raw = `${amount}:${random}:${COUPON_SALT}`;
      let hash = 0;
      for (let i = 0; i < raw.length; i++) {
        hash = ((hash << 5) - hash) + raw.charCodeAt(i);
        hash |= 0;
      }
      const expectedSig = Math.abs(hash).toString(16).toUpperCase();

      if (providedSig === expectedSig) {
        return amount;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  // ------------------------------------------------------------
  // PAYMENT & REDEMPTION CALLBACK HANDLER
  // ------------------------------------------------------------
  useEffect(() => {
    if (processedRef.current) return;
    
    const params = new URLSearchParams(window.location.search);
    
    // 1. STRIPE SUCCESS
    const isSuccess = params.get('payment_success');
    const amountToAdd = params.get('amount');

    if (isSuccess === 'true' && amountToAdd) {
      const creditsToAdd = parseInt(amountToAdd, 10);
      if (!isNaN(creditsToAdd)) {
        setCredits(prev => prev + creditsToAdd);
        showToast(`Payment Successful! ${creditsToAdd} Credits added.`);
        if (appState === AppState.LANDING) {
           setAppState(AppState.DASHBOARD);
        }
      }
    }

    // 2. MAGIC REDEMPTION LINK (WhatsApp)
    const redeemCode = params.get('redeem');
    if (redeemCode) {
      const cleanCode = redeemCode.trim().toUpperCase();
      setInitialRedeemCode(cleanCode);
      setShowPaymentModal(true);
      if (appState === AppState.LANDING) {
           setAppState(AppState.DASHBOARD);
      }
    }

    if (isSuccess || redeemCode) {
       window.history.replaceState({}, document.title, window.location.pathname);
       processedRef.current = true;
    }
  }, [appState]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // --- DEMO / SAMPLE PROJECT HANDLER ---
  const handleTryDemo = () => {
    setAppState(AppState.UPLOAD);
    const dummyContent = "DUMMY_DWG_CONTENT";
    const blob = new Blob([dummyContent], { type: 'image/vnd.dwg' });
    const dummyFile = new File([blob], "Sample_Villa_Project_G+1.dwg", { type: 'image/vnd.dwg' });
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const resultStr = e.target.result as string;
        const base64Data = resultStr.split(',')[1];
        const fileUrl = URL.createObjectURL(dummyFile);
        
        setUploadedFiles([{
          name: dummyFile.name,
          type: dummyFile.type || 'application/octet-stream', 
          data: base64Data, 
          url: fileUrl
        }]);
        setSpecFile(null); 
        setContractFile(null);
        setAppState(AppState.INSTRUCTIONS);
      }
    };
    reader.readAsDataURL(dummyFile);
  };

  const handleFileSelect = async (drawings: File[], spec?: File, contract?: File) => {
    setError(null);
    setSpecFile(null); 
    setContractFile(null);
    
    if (drawings.length === 0) return;

    const validMimeTypes = ['image/png', 'image/jpeg', 'application/pdf', 'application/x-pdf', 'application/zip', 'application/x-zip-compressed', 'application/octet-stream'];
    const validExtensions = ['.dwg', '.dxf', '.zip', '.pdf', '.png', '.jpg', '.jpeg'];

    const processedFiles: UploadedFile[] = [];

    try {
        // PROCESS EACH DRAWING FILE
        for (const file of drawings) {
            const ext = '.' + file.name.split('.').pop()?.toLowerCase();
            
            // IF ZIP: EXTRACT
            if (ext === '.zip' || file.type.includes('zip')) {
                const zip = await JSZip.loadAsync(file);
                for (const filename of Object.keys(zip.files)) {
                    const zipFile = zip.files[filename];
                    if (zipFile.dir) continue;
                    
                    const subExt = '.' + filename.split('.').pop()?.toLowerCase();
                    if (validExtensions.includes(subExt)) {
                        const content = await zipFile.async('blob');
                        const extractedFile = new File([content], filename, { type: content.type });
                        const uf = await processSingleFile(extractedFile);
                        processedFiles.push(uf);
                    }
                }
            } else if (validExtensions.includes(ext) || validMimeTypes.includes(file.type)) {
                // NORMAL FILE
                const uf = await processSingleFile(file);
                processedFiles.push(uf);
            }
        }

        if (processedFiles.length === 0) {
            setError("No valid drawings found. Please upload PDF, PNG, JPG, or DWG files.");
            return;
        }

        setUploadedFiles(processedFiles);

        // --- HANDLE SPECIFICATION READ ---
        if (spec) {
            const specUf = await processSingleFile(spec);
            setSpecFile(specUf);
        }

        // --- HANDLE CONTRACT READ ---
        if (contract) {
            const contractUf = await processSingleFile(contract);
            setContractFile(contractUf);
        }

        setAppState(AppState.INSTRUCTIONS);

    } catch (err) {
      console.error(err);
      setError("Failed to process uploaded files.");
    }
  };

  const processSingleFile = (file: File): Promise<UploadedFile> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const resultStr = e.target.result as string;
            const base64Data = resultStr.split(',')[1];
            const fileUrl = URL.createObjectURL(file);
            resolve({
              name: file.name,
              type: file.type || 'application/octet-stream', 
              data: base64Data, 
              url: fileUrl
            });
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  }

  // --- ANALYSIS & SAVE LOGIC ---
  const handleStartAnalysis = async (
    instructions: string, 
    scopes: string[], 
    includeRebar: boolean, 
    floorCount: number, 
    basementCount: number, 
    storyHeight: number,
    unitSystem: 'metric' | 'imperial'
  ) => {
    if (uploadedFiles.length === 0) return;

    setAppState(AppState.ANALYZING);

    try {
      // Prepare Inputs
      const filesToSend: FileInput[] = uploadedFiles.map(f => {
          const ext = '.' + f.name.split('.').pop()?.toLowerCase();
          const isCad = ext === '.dwg' || ext === '.dxf';
          const finalMime = isCad ? 'image/vnd.dwg' : (f.type || 'application/pdf');
          return {
              fileName: f.name,
              data: f.data,
              mimeType: finalMime
          };
      });
      
      const newResult = await generateTakeoff(
        filesToSend, 
        instructions, 
        scopes, 
        includeRebar, 
        floorCount, 
        basementCount, 
        storyHeight,
        specFile?.data, 
        specFile?.type,
        unitSystem,
        appMode,
        contractFile?.data,
        contractFile?.type
      );
      
      let finalResult: TakeoffResult;

      if (isMerging && takeoffData) {
        // MERGE
        finalResult = {
          id: takeoffData.id, // Keep existing ID
          isPaid: takeoffData.isPaid, // Keep payment status
          date: new Date().toISOString(), // Update date
          projectName: takeoffData.projectName,
          sourceFiles: [...(takeoffData.sourceFiles || []), ...uploadedFiles.map(f => f.name)],
          items: [...takeoffData.items, ...newResult.items],
          rebarItems: [...takeoffData.rebarItems, ...newResult.rebarItems],
          summary: takeoffData.summary + "\n\n--- ADDITIONAL BATCH ---\n" + newResult.summary,
          drawingType: takeoffData.drawingType,
          unitSystem: takeoffData.unitSystem
        };
      } else {
        // NEW
        finalResult = {
          ...newResult,
          isPaid: false, // Default to LOCKED
          sourceFiles: uploadedFiles.map(f => f.name)
        };
      }

      setTakeoffData(finalResult);
      
      // AUTO SAVE PROJECT TO LOCAL STORAGE
      setSavedProjects(prev => {
          const filtered = prev.filter(p => p.id !== finalResult.id);
          return [finalResult, ...filtered];
      });

      setAppState(AppState.RESULTS);
      setIsMerging(false); 

    } catch (err) {
      console.error(err);
      setError("Failed to analyze documents. Ensure files are valid.");
      setAppState(AppState.UPLOAD);
    }
  };

  const handleReset = () => {
    setAppState(AppState.DASHBOARD); 
    setUploadedFiles([]);
    setSpecFile(null);
    setContractFile(null);
    setTakeoffData(null);
    setError(null);
    setIsMerging(false);
  };

  const handleAddDrawing = () => {
    setUploadedFiles([]);
    setSpecFile(null);
    setContractFile(null);
    setIsMerging(true);
    setAppState(AppState.UPLOAD);
  };

  const handleSelectMode = (mode: AppMode) => {
    setAppMode(mode);
    setAppState(AppState.UPLOAD);
  };

  // --- UNLOCKING LOGIC (PERMANENT) ---
  const handleUnlockProject = () => {
    if (!takeoffData) return false;
    
    // Check credits
    if (credits <= 0) {
      setShowPaymentModal(true);
      return false;
    }

    // Spend Credit
    setCredits(prev => prev - 1);

    // Update Project Status
    const updatedProject = { ...takeoffData, isPaid: true };
    setTakeoffData(updatedProject);

    // Persist Change
    setSavedProjects(prev => {
        return prev.map(p => p.id === updatedProject.id ? updatedProject : p);
    });

    showToast("Project Unlocked! You can now Export & Print.");
    return true;
  };

  const handlePaymentSuccess = (amount: number) => {
    setCredits(prev => prev + amount);
    showToast(`Success! ${amount} Credits added.`);
  };

  const handleRedeemCode = (inputCode: string) => {
      const code = inputCode.trim();
      if (customCodes[code] && !usedCodes.includes(code)) {
         handlePaymentSuccess(customCodes[code]);
         setUsedCodes(prev => [...prev, code]);
         return true;
      }
      const validAmount = verifySignedCode(code.toUpperCase());
      if (validAmount !== null && !usedCodes.includes(code.toUpperCase())) {
         handlePaymentSuccess(validAmount);
         setUsedCodes(prev => [...prev, code.toUpperCase()]);
         return true;
      }
      return false;
  };

  // --- DASHBOARD HANDLERS ---
  const handleOpenProject = (project: TakeoffResult) => {
      setTakeoffData(project);
      setAppState(AppState.RESULTS);
  };

  const handleDeleteProject = (id: string) => {
      if (window.confirm("Are you sure you want to delete this project?")) {
          setSavedProjects(prev => prev.filter(p => p.id !== id));
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative flex flex-col">
      {!hasAcceptedDisclaimer && appState !== AppState.LANDING && (
         <DisclaimerModal onAccept={handleDisclaimerAccept} />
      )}
      
      {/* GLOBAL CHAT SUPPORT (Visible on all pages) */}
      <ChatSupport />

      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-top-5 duration-300">
          <CheckCircle className="w-6 h-6 text-green-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {showPaymentModal && (
        <PaymentModal 
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          onRedeem={handleRedeemCode}
          initialCode={initialRedeemCode}
        />
      )}

      {showTutorial && (
        <TutorialModal onClose={() => setShowTutorial(false)} />
      )}

      {appState === AppState.LANDING && (
        <LandingPage 
          onGetStarted={() => setAppState(AppState.DASHBOARD)} 
          onLogin={() => setShowPaymentModal(true)}
          onTryDemo={handleTryDemo}
          onOpenGuide={() => setShowTutorial(true)}
        />
      )}

      {appState !== AppState.LANDING && (
        <>
          {/* NAVBAR */}
          {appState !== AppState.RESULTS && (
            <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center">
                   {appState !== AppState.DASHBOARD && (
                       <button 
                          onClick={() => setAppState(AppState.DASHBOARD)} 
                          className="mr-3 p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                          title="Back to Dashboard"
                       >
                          <ChevronLeft className="w-5 h-5" />
                       </button>
                   )}
                   <Logo showText={true} />
                </div>
                
                <div className="flex items-center space-x-4">
                   <button 
                      onClick={() => setShowTutorial(true)}
                      className="text-slate-500 hover:text-brand-600 font-medium text-sm flex items-center transition-colors mr-2"
                   >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Guide
                   </button>
                   <div className="hidden md:flex flex-col items-end mr-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Wallet Balance</span>
                      <span className="text-sm font-bold text-slate-800">{credits} Credits</span>
                   </div>
                   <button 
                      onClick={() => setShowPaymentModal(true)}
                      className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                   >
                      <Wallet className="w-4 h-4 mr-2" />
                      Top Up
                   </button>
                </div>
              </div>
            </nav>
          )}

          <div className={`flex-1 flex flex-col ${appState !== AppState.RESULTS ? 'max-w-7xl mx-auto w-full' : 'h-full'}`}>
              
              {/* DASHBOARD VIEW */}
              {appState === AppState.DASHBOARD && (
                  <DashboardView 
                      projects={savedProjects}
                      onNewProject={() => setAppState(AppState.MODE_SELECT)}
                      onOpenProject={handleOpenProject}
                      onDeleteProject={handleDeleteProject}
                      onBack={() => setAppState(AppState.LANDING)}
                      onOpenGuide={() => setShowTutorial(true)}
                  />
              )}

              {/* MODE SELECTION */}
              {appState === AppState.MODE_SELECT && (
                  <div className="flex-1 flex flex-col justify-center items-center animate-in fade-in slide-in-from-bottom-5 duration-500 p-6">
                      <div className="text-center mb-10">
                          <h2 className="text-3xl font-bold text-slate-900">Select Project Type</h2>
                          <p className="text-slate-500 mt-2">Choose the workflow that matches your needs</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
                          <button 
                             onClick={() => handleSelectMode(AppMode.ESTIMATION)}
                             className="group relative bg-white border border-slate-200 p-8 rounded-2xl shadow-sm hover:shadow-xl hover:border-brand-500 transition-all text-left"
                          >
                             <div className="bg-brand-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Calculator className="w-7 h-7 text-brand-600" />
                             </div>
                             <h3 className="text-xl font-bold text-slate-900 mb-2">Quantity Estimation</h3>
                             <p className="text-sm text-slate-500 mb-6">
                                Upload drawings to generate a full Bill of Quantities (BOQ). Ideal for Tendering and Cost Estimation.
                             </p>
                             <div className="flex items-center text-brand-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                                Select Estimation <ArrowRight className="w-4 h-4 ml-1" />
                             </div>
                          </button>

                          <button 
                             onClick={() => handleSelectMode(AppMode.PAYMENT)}
                             className="group relative bg-white border border-slate-200 p-8 rounded-2xl shadow-sm hover:shadow-xl hover:border-green-500 transition-all text-left"
                          >
                             <div className="bg-green-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <FileCheck className="w-7 h-7 text-green-600" />
                             </div>
                             <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Certificate</h3>
                             <p className="text-sm text-slate-500 mb-6">
                                Create Interim or Final Payment Certificates. Compares Contract vs Executed Quantities.
                             </p>
                             <div className="flex items-center text-green-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                                Select Payment <ArrowRight className="w-4 h-4 ml-1" />
                             </div>
                          </button>
                      </div>

                      <div className="mt-12 text-center">
                         <button onClick={handleTryDemo} className="text-sm font-medium text-slate-400 hover:text-brand-600 underline decoration-dotted underline-offset-4">
                            Or try the Sample Villa Project (Demo)
                         </button>
                      </div>
                  </div>
              )}

              {/* UPLOAD VIEW */}
              {appState === AppState.UPLOAD && (
                 <div className="flex-1 flex flex-col justify-center animate-in fade-in duration-300 p-6">
                    <div className="text-center mb-8">
                       <h2 className="text-2xl font-bold text-slate-900">Upload Project Documents</h2>
                       <p className="text-slate-500">Supported Formats: PDF, DWG, PNG, ZIP</p>
                    </div>
                    <FileUpload onFileSelect={handleFileSelect} error={error} />
                    <div className="mt-8 text-center">
                        <button onClick={handleTryDemo} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                            Don't have a file? Try our Sample Project
                        </button>
                    </div>
                 </div>
              )}

              {/* INSTRUCTION VIEW */}
              {appState === AppState.INSTRUCTIONS && (
                  <div className="p-6 h-full flex flex-col">
                    <InstructionView 
                       fileName={uploadedFiles.length === 1 ? uploadedFiles[0].name : `${uploadedFiles.length} Files Selected`}
                       onStart={handleStartAnalysis} 
                       onCancel={() => setAppState(AppState.UPLOAD)} 
                    />
                  </div>
              )}

              {/* ANALYZING VIEW */}
              {appState === AppState.ANALYZING && (
                  <AnalysisView fileName={uploadedFiles[0]?.name || "Project Documents"} />
              )}

              {/* RESULTS VIEW */}
              {appState === AppState.RESULTS && takeoffData && (
                  <ResultsView 
                     data={takeoffData} 
                     files={uploadedFiles}
                     onReset={handleReset}
                     onAddDrawing={handleAddDrawing}
                     credits={credits}
                     onUnlockProject={handleUnlockProject} // CHANGED: Passed specific unlock handler
                     onBuyCredits={() => setShowPaymentModal(true)}
                     appMode={appMode}
                  />
              )}
          </div>
        </>
      )}
    </div>
  );
};

export default App;
