
import React from 'react';
import { TakeoffResult, AppMode } from '../types';
import { PlusCircle, FileText, Calendar, Trash2, ChevronRight, FolderOpen, Search, HardHat, Clock, Layers, Lock, Unlock, ArrowLeft, BookOpen } from 'lucide-react';

interface DashboardViewProps {
  projects: TakeoffResult[];
  onNewProject: () => void;
  onOpenProject: (project: TakeoffResult) => void;
  onDeleteProject: (id: string) => void;
  onBack: () => void;
  onOpenGuide: () => void; // New prop
}

export const DashboardView: React.FC<DashboardViewProps> = ({ projects, onNewProject, onOpenProject, onDeleteProject, onBack, onOpenGuide }) => {
  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-6 md:p-10 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center">
          <button 
            onClick={onBack}
            className="mr-4 p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
            title="Back to Landing Page"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center uppercase tracking-wide">
              <FolderOpen className="w-6 h-6 mr-3 text-slate-400" />
              Project Hub
            </h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Workspace: Default</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={onOpenGuide}
                className="text-slate-500 hover:text-brand-600 font-bold text-sm flex items-center px-4 py-2.5 rounded-md hover:bg-slate-100 transition-colors"
            >
                <BookOpen className="w-4 h-4 mr-2" />
                User Guide
            </button>
            <button 
            onClick={onNewProject}
            className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-md font-bold text-sm flex items-center shadow-md transition-all hover:translate-y-[-1px]"
            >
            <PlusCircle className="w-4 h-4 mr-2" />
            New Estimation
            </button>
        </div>
      </div>

      {/* Project Grid */}
      {projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 p-16 text-center">
           <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
              <Layers className="w-8 h-8 text-slate-300" />
           </div>
           <h3 className="text-lg font-bold text-slate-800 mb-2">No Active Projects</h3>
           <p className="text-slate-500 max-w-sm text-sm mb-8 leading-relaxed">
             Initialize a new takeoff from PDF or CAD drawings. Your workspace is currently empty.
           </p>
           <button 
             onClick={onNewProject}
             className="text-brand-600 font-bold hover:text-brand-800 hover:underline text-sm uppercase tracking-wide"
           >
             Initialize Project &rarr;
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id || Math.random().toString()} 
              className="group bg-white rounded-lg border border-slate-300 hover:border-brand-400 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden flex flex-col"
              onClick={() => onOpenProject(project)}
            >
              {/* Status Strip */}
              <div className={`h-1.5 w-full transition-colors ${project.isPaid ? 'bg-green-500' : 'bg-amber-500'}`}></div>
              
              <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-slate-100 p-2 rounded-md border border-slate-200 text-slate-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex items-center space-x-2">
                        {project.isPaid ? (
                            <div className="text-green-500 bg-green-50 p-1.5 rounded-full" title="Project Unlocked"><Unlock className="w-3.5 h-3.5" /></div>
                        ) : (
                            <div className="text-amber-500 bg-amber-50 p-1.5 rounded-full" title="Locked"><Lock className="w-3.5 h-3.5" /></div>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id!); }}
                          className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1 line-clamp-1 group-hover:text-brand-700 transition-colors">
                    {project.projectName}
                  </h3>
                  <div className="flex items-center text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-4">
                    Ref: {project.id ? project.id.substring(0,8) : 'N/A'}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
                     <div>
                        <span className="block text-slate-400 text-[10px] uppercase">Items</span>
                        <span className="font-mono font-bold text-slate-700">{project.items.length}</span>
                     </div>
                     <div>
                        <span className="block text-slate-400 text-[10px] uppercase">Last Mod</span>
                        <span className="font-mono font-bold text-slate-700">{new Date(project.date || Date.now()).toLocaleDateString()}</span>
                     </div>
                  </div>
              </div>

              <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-between items-center group-hover:bg-brand-50/30 transition-colors">
                 <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Open File
                 </span>
                 <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
