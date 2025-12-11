
import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, FileType, AlertCircle, FileText, Check, X, Folder, Layers, BadgeDollarSign, FileSpreadsheet, FileImage } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (drawings: File[], spec?: File, contract?: File) => void;
  error?: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, error }) => {
  const [drawingFiles, setDrawingFiles] = useState<File[]>([]);
  const [specFile, setSpecFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  
  // To store preview URLs for images
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const drawingInputRef = useRef<HTMLInputElement>(null);
  const specInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
      return () => {
          Object.values(previews).forEach(url => URL.revokeObjectURL(url as string));
      };
  }, []);

  const generatePreviews = (files: File[]) => {
      const newPreviews: Record<string, string> = {};
      files.forEach(file => {
          if (file.type.startsWith('image/')) {
              newPreviews[file.name] = URL.createObjectURL(file);
          }
      });
      setPreviews(prev => ({ ...prev, ...newPreviews }));
  };

  const handleDrawingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files) as File[];
      const combinedFiles = [...drawingFiles, ...newFiles];
      
      // Remove duplicates by name
      const uniqueFiles = combinedFiles.filter((file, index, self) =>
        index === self.findIndex((f) => f.name === file.name)
      );

      setDrawingFiles(uniqueFiles);
      generatePreviews(newFiles);
      onFileSelect(uniqueFiles, specFile || undefined, contractFile || undefined);
    }
  };

  const removeDrawing = (e: React.MouseEvent, fileName: string) => {
      e.stopPropagation();
      const updatedList = drawingFiles.filter(f => f.name !== fileName);
      setDrawingFiles(updatedList);
      onFileSelect(updatedList, specFile || undefined, contractFile || undefined);
  };

  const handleSpecChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSpecFile(file);
      onFileSelect(drawingFiles, file, contractFile || undefined);
    }
  };

  const handleContractChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setContractFile(file);
      onFileSelect(drawingFiles, specFile || undefined, file);
    }
  };

  const removeSpec = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSpecFile(null);
    if (specInputRef.current) specInputRef.current.value = '';
    onFileSelect(drawingFiles, undefined, contractFile || undefined);
  };

  const removeContract = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContractFile(null);
    if (contractInputRef.current) contractInputRef.current.value = '';
    onFileSelect(drawingFiles, specFile || undefined, undefined);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      
      {/* PRIMARY: DRAWING UPLOAD (Multiple Files / Folder) */}
      <div 
        className="relative border-2 border-dashed border-slate-300 hover:border-brand-400 hover:bg-slate-50 bg-white rounded-2xl p-8 text-center cursor-pointer transition-all group"
        onClick={() => drawingInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={drawingInputRef} 
          className="hidden" 
          multiple // ALLOW MULTIPLE FILES
          accept="image/png,image/jpeg,application/pdf,.dwg,.dxf,.zip" 
          onChange={handleDrawingChange}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 rounded-full bg-slate-100 text-slate-400 group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors">
            {drawingFiles.length > 0 ? <Layers className="w-10 h-10 text-green-500" /> : <UploadCloud className="w-10 h-10" />}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-800 mb-1">
              1. Upload Drawings (Required)
            </h3>
            <p className="text-slate-500 text-sm">
              Select multiple PDFs, Images, or a full ZIP.
            </p>
          </div>
        </div>
      </div>

      {/* THUMBNAIL GRID */}
      {drawingFiles.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2">
              {drawingFiles.map((file) => (
                  <div key={file.name} className="relative group bg-white border border-slate-200 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow">
                      <button 
                          onClick={(e) => removeDrawing(e, file.name)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                          <X className="w-3 h-3" />
                      </button>
                      
                      <div className="h-24 w-full bg-slate-100 rounded mb-2 overflow-hidden flex items-center justify-center">
                          {file.type.startsWith('image/') && previews[file.name] ? (
                              <img src={previews[file.name]} alt="preview" className="w-full h-full object-cover" />
                          ) : (
                              <div className="text-slate-400">
                                  {file.type.includes('pdf') ? <FileText className="w-8 h-8" /> : <FileImage className="w-8 h-8" />}
                              </div>
                          )}
                      </div>
                      <p className="text-[10px] text-slate-600 truncate font-medium" title={file.name}>
                          {file.name}
                      </p>
                      <p className="text-[9px] text-slate-400 uppercase">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                  </div>
              ))}
              {/* Add More Button */}
              <div 
                  onClick={() => drawingInputRef.current?.click()}
                  className="flex flex-col items-center justify-center h-full min-h-[120px] border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-400 hover:text-brand-500 transition-colors"
              >
                  <PlusButtonIcon className="w-6 h-6 mb-1" />
                  <span className="text-xs font-bold">Add More</span>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SECONDARY: SPECIFICATION UPLOAD */}
          <div 
              className={`border border-dashed rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all ${
                  specFile ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 hover:border-amber-300'
              }`}
              onClick={() => specInputRef.current?.click()}
          >
              <input 
                  type="file" 
                  ref={specInputRef} 
                  className="hidden" 
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" 
                  onChange={handleSpecChange}
              />
              
              <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${specFile ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                      <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                      <h4 className={`text-xs font-bold uppercase ${specFile ? 'text-slate-900' : 'text-slate-500'}`}>
                          2. Specs (Optional)
                      </h4>
                      <p className="text-xs text-slate-400 truncate max-w-[120px]">
                          {specFile ? specFile.name : "Tech Specs / Methods"}
                      </p>
                  </div>
              </div>

              {specFile && (
                  <button onClick={removeSpec} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                  </button>
              )}
          </div>

          {/* TERTIARY: CONTRACT / PREVIOUS PAYMENT UPLOAD */}
          <div 
              className={`border border-dashed rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all ${
                  contractFile ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-green-300'
              }`}
              onClick={() => contractInputRef.current?.click()}
          >
              <input 
                  type="file" 
                  ref={contractInputRef} 
                  className="hidden" 
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.csv" 
                  onChange={handleContractChange}
              />
              
              <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${contractFile ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                      <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                      <h4 className={`text-xs font-bold uppercase ${contractFile ? 'text-slate-900' : 'text-slate-500'}`}>
                          3. Prev. Payment (Excel)
                      </h4>
                      <p className="text-xs text-slate-400 truncate max-w-[120px]">
                          {contractFile ? contractFile.name : "Upload Excel/BOQ"}
                      </p>
                  </div>
              </div>

              {contractFile && (
                  <button onClick={removeContract} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                  </button>
              )}
          </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start space-x-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-red-700">
            <p className="font-medium">Upload failed</p>
            <p>{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Icon
const PlusButtonIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12h8" />
        <path d="M12 8v8" />
    </svg>
);
