
import React, { useState, useEffect } from 'react';
import { X, BookOpen, FileText, Layers, Settings, FileSpreadsheet, CheckCircle, ChevronRight, AlertTriangle, CreditCard } from 'lucide-react';

interface TutorialModalProps {
  onClose: () => void;
}

const TOPICS = [
  { id: 'intro', title: '1. Workflow Overview', icon: BookOpen },
  { id: 'prep', title: '2. Document Prep', icon: FileText },
  { id: 'config', title: '3. Configuration', icon: Settings },
  { id: 'analysis', title: '4. Analysis Engine', icon: Layers },
  { id: 'export', title: '5. Results & Export', icon: FileSpreadsheet },
  { id: 'billing', title: '6. Credits & Billing', icon: CreditCard },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
  const [activeTopic, setActiveTopic] = useState('intro');
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const savedPref = localStorage.getItem('constructAi_hideTutorial');
    if (savedPref === 'true') {
        setDontShowAgain(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
        localStorage.setItem('constructAi_hideTutorial', 'true');
    }
    onClose();
  };

  const renderContent = () => {
    switch (activeTopic) {
        case 'intro':
            return (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">ConstructAI Workflow</h3>
                    <p className="text-slate-600">
                        ConstructAI is an algorithmic estimation tool designed to automate the Quantity Surveying process (Takeoff & BOQ) for East African construction projects.
                    </p>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h4 className="font-bold text-sm text-slate-800 mb-2 uppercase tracking-wide">The 4-Step Process:</h4>
                        <ul className="space-y-3">
                            <li className="flex items-start text-sm text-slate-600">
                                <span className="bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded text-xs mr-3 mt-0.5">01</span>
                                Upload digital drawings (PDF, CAD, or Images).
                            </li>
                            <li className="flex items-start text-sm text-slate-600">
                                <span className="bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded text-xs mr-3 mt-0.5">02</span>
                                Define Building Parameters (Floors, Height, Scopes).
                            </li>
                            <li className="flex items-start text-sm text-slate-600">
                                <span className="bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded text-xs mr-3 mt-0.5">03</span>
                                AI Analysis & Extraction (SMM7 Standard).
                            </li>
                            <li className="flex items-start text-sm text-slate-600">
                                <span className="bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded text-xs mr-3 mt-0.5">04</span>
                                Review, Unlock, and Export to Excel.
                            </li>
                        </ul>
                    </div>
                </div>
            );
        case 'prep':
            return (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">Document Preparation</h3>
                    <p className="text-slate-600">For optimal accuracy, ensure your input files meet the following criteria:</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <div className="flex items-center mb-2 text-green-600 font-bold text-sm">
                                <CheckCircle className="w-4 h-4 mr-2" /> Supported
                            </div>
                            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                                <li><strong>PDF</strong> (Vector or Raster)</li>
                                <li><strong>DWG/DXF</strong> (AutoCAD 2018+)</li>
                                <li><strong>Images</strong> (PNG/JPG High Res)</li>
                                <li><strong>ZIP</strong> (Batch Processing)</li>
                            </ul>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <div className="flex items-center mb-2 text-amber-600 font-bold text-sm">
                                <AlertTriangle className="w-4 h-4 mr-2" /> Best Practices
                            </div>
                            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                                <li>Separate Arch & Struct files if possible.</li>
                                <li>Ensure Grid Lines (Axis) are visible.</li>
                                <li>Upload <strong>Floor Plans</strong> for Areas.</li>
                                <li>Upload <strong>Sections</strong> for Heights.</li>
                            </ul>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 italic mt-2">
                        *Note: If uploading multiple files, the AI will cross-reference them to deduce dimensions (e.g., Area from Plan x Height from Section).
                    </p>
                </div>
            );
        case 'config':
            return (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">Configuration Parameters</h3>
                    <p className="text-slate-600">Before analysis, you must define the building context to help the AI interpret geometry correctly.</p>
                    
                    <div className="space-y-3">
                        <div className="border-l-4 border-brand-500 pl-4 py-1">
                            <h4 className="font-bold text-slate-800 text-sm">Floor Count (Timesing)</h4>
                            <p className="text-xs text-slate-600">
                                If analyzing a <strong>Typical Floor Plan</strong> for a G+10 building, set Floor Count to 10. The AI will multiply relevant quantities (Columns, Beams, Walls) by this factor automatically.
                            </p>
                        </div>
                        <div className="border-l-4 border-brand-500 pl-4 py-1">
                            <h4 className="font-bold text-slate-800 text-sm">Scope Selection</h4>
                            <p className="text-xs text-slate-600">
                                Use the checkboxes to limit analysis. For example, if you only need a <strong>Structural Frame</strong> estimate, uncheck "Finishing Works" and "MEP". This improves processing speed and accuracy.
                            </p>
                        </div>
                        <div className="border-l-4 border-brand-500 pl-4 py-1">
                            <h4 className="font-bold text-slate-800 text-sm">Rebar Schedule</h4>
                            <p className="text-xs text-slate-600">
                                Enable "Generate Rebar Schedule" ONLY if your drawings contain structural detailing tables or clear bar marks. The AI extracts this into a separate BS 8666 compliant schedule.
                            </p>
                        </div>
                    </div>
                </div>
            );
        case 'analysis':
            return (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">The Analysis Engine</h3>
                    <p className="text-slate-600">ConstructAI uses Google Gemini 2.5 Vision models to "see" and "read" your drawings like a human engineer.</p>
                    
                    <ul className="space-y-3 mt-4">
                        <li className="flex items-start">
                            <Layers className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-slate-800">Visual Recognition</h4>
                                <p className="text-xs text-slate-600">Identifies geometric shapes (Lines for walls, Rectangles for columns, Hatches for materials).</p>
                            </div>
                        </li>
                        <li className="flex items-start">
                            <FileText className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-slate-800">OCR Text Extraction</h4>
                                <p className="text-xs text-slate-600">Reads text labels, dimensions, room tags, and title blocks to understand context.</p>
                            </div>
                        </li>
                        <li className="flex items-start">
                            <Settings className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-slate-800">Logic & Deduction</h4>
                                <p className="text-xs text-slate-600">Applies construction logic (e.g., "If there is a wall, there must be plaster/paint on both sides unless labeled otherwise").</p>
                            </div>
                        </li>
                    </ul>
                </div>
            );
        case 'export':
            return (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">Results & Excel Export</h3>
                    
                    <div className="bg-brand-50 p-4 rounded-lg text-sm text-brand-900 mb-4">
                        <strong>Feature Highlight:</strong> We export <em>Live Formulas</em>, not just static values.
                        <br/>
                        <code className="text-xs bg-white px-1 py-0.5 rounded border border-brand-200 mt-1 inline-block">=SUM(D5:D20)*1.15</code>
                    </div>

                    <h4 className="font-bold text-slate-800 text-sm mt-4">Tabs Overview:</h4>
                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                        <li><strong>Takeoff Sheet:</strong> The detailed "Dimension Paper" view. You can edit dimensions here.</li>
                        <li><strong>Bill of Quantities:</strong> The summarized view grouped by category (Substructure, Superstructure, etc.).</li>
                        <li><strong>Analytics:</strong> Charts showing cost distribution (Material vs Labor).</li>
                    </ul>

                    <p className="text-xs text-slate-500 mt-4">
                        You can edit Descriptions and Quantities directly in the web interface before exporting.
                    </p>
                </div>
            );
        case 'billing':
            return (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">Credits & Payment</h3>
                    <p className="text-slate-600">We use a flexible "Pay-As-You-Go" credit system.</p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="border border-slate-200 rounded-lg p-4 text-center hover:border-brand-500 transition-colors">
                            <div className="text-2xl font-bold text-slate-900">1 Credit</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Per Project Export</div>
                            <p className="text-xs text-slate-400 mt-2">Unlock once, export forever.</p>
                        </div>
                        <div className="border border-slate-200 rounded-lg p-4 text-center hover:border-green-500 transition-colors">
                            <div className="text-2xl font-bold text-slate-900">Telebirr</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Accepted</div>
                            <p className="text-xs text-slate-400 mt-2">Local mobile money integration.</p>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-amber-50 rounded text-xs text-amber-800 border border-amber-100 flex items-start">
                        <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                        Projects are initially "Locked" (Preview Only). You must spend 1 Credit to unlock the ability to Print or Download Excel.
                    </div>
                </div>
            );
        default:
            return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[600px] flex overflow-hidden border border-slate-200">
            
            {/* Sidebar Navigation */}
            <div className="w-64 bg-slate-100 border-r border-slate-200 flex flex-col">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center">
                        <BookOpen className="w-5 h-5 mr-2 text-brand-600" />
                        User Guide
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Technical Manual v2.0</p>
                </div>
                <div className="flex-1 overflow-y-auto py-4">
                    {TOPICS.map((topic) => (
                        <button
                            key={topic.id}
                            onClick={() => setActiveTopic(topic.id)}
                            className={`w-full text-left px-6 py-3 flex items-center text-sm font-medium transition-colors ${
                                activeTopic === topic.id 
                                    ? 'bg-white text-brand-600 border-l-4 border-brand-600 shadow-sm' 
                                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 border-l-4 border-transparent'
                            }`}
                        >
                            <topic.icon className={`w-4 h-4 mr-3 ${activeTopic === topic.id ? 'text-brand-600' : 'text-slate-400'}`} />
                            {topic.title}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-200 bg-slate-50">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                        />
                        <span className="text-xs text-slate-600 font-medium">Don't show this again</span>
                    </label>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col">
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
                    <button 
                        onClick={handleClose}
                        className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    {renderContent()}
                </div>
                
                {/* Footer Navigation */}
                <div className="p-6 border-t border-slate-200 bg-white flex justify-between items-center">
                    <div className="text-xs text-slate-400">
                        Topic {TOPICS.findIndex(t => t.id === activeTopic) + 1} of {TOPICS.length}
                    </div>
                    <div className="flex space-x-3">
                        <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                            Close Guide
                        </button>
                        {activeTopic !== 'billing' ? (
                            <button 
                                onClick={() => {
                                    const idx = TOPICS.findIndex(t => t.id === activeTopic);
                                    if (idx < TOPICS.length - 1) setActiveTopic(TOPICS[idx + 1].id);
                                }}
                                className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 flex items-center transition-colors"
                            >
                                Next Topic <ChevronRight className="w-4 h-4 ml-2" />
                            </button>
                        ) : (
                            <button 
                                onClick={handleClose}
                                className="px-6 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg hover:bg-brand-700 flex items-center transition-colors shadow-md"
                            >
                                Finish <CheckCircle className="w-4 h-4 ml-2" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
