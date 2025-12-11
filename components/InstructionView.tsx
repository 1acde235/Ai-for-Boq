
import React, { useState } from 'react';
import { MessageSquarePlus, ChevronRight, CheckSquare, Square, Grid, Ruler, Layers, ArrowDownToLine, Globe, FolderOpen } from 'lucide-react';

interface InstructionViewProps {
  fileName: string;
  onStart: (instructions: string, scopes: string[], includeRebar: boolean, floorCount: number, basementCount: number, storyHeight: number, unitSystem: 'metric' | 'imperial') => void;
  onCancel: () => void;
}

const SUGGESTIONS = [
  "Use Trench Fill Foundation methodology",
  "Calculate for Deep Strip Foundations",
  "Assume Raft Foundation with 200mm slab",
  "Ignore external landscaping works"
];

// Granular Scopes grouped by Category
const SCOPE_GROUPS = [
  {
    title: "General & External",
    items: [
      { id: 'Preliminaries', label: 'Preliminaries', desc: 'Site Setup, Cranes, Scaffolding, Insurance' },
      { id: 'ExternalWorks', label: 'External Works', desc: 'Boundary Walls, Landscaping, Paving' }
    ]
  },
  {
    title: "Structural Elements",
    items: [
      { id: 'Excavation', label: 'Excavation', desc: 'Earthworks, Trenching, Basements' },
      { id: 'Foundations', label: 'Foundations', desc: 'Footings, Pile Caps, Raft' },
      { id: 'Columns', label: 'Columns', desc: 'Concrete Columns' },
      { id: 'Beams', label: 'Beams', desc: 'Grade & Floor Beams' },
      { id: 'Slabs', label: 'Slabs', desc: 'Suspended/Ground Slabs' },
      { id: 'Stairs', label: 'Stairs', desc: 'Concrete Staircases' },
      { id: 'Walls_Structural', label: 'Shear Walls', desc: 'Retaining/Core Walls (High Rise)' },
      { id: 'Formwork', label: 'Formwork', desc: 'Shuttering for all concrete elements' }, 
    ]
  },
  {
    title: "Architectural & Finishes",
    items: [
      { id: 'Walls_Masonry', label: 'Masonry Walls', desc: 'Brick/Block Partitions' },
      { id: 'Facade', label: 'Facade / Curtain Wall', desc: 'Glass, Cladding (High Rise)' },
      { id: 'Openings', label: 'Doors & Windows', desc: 'Frames, Glazing' },
      { id: 'Flooring', label: 'Floor Finishes', desc: 'Tiles, Screed, Carpet' },
      { id: 'Ceiling', label: 'Ceiling Finishes', desc: 'Gypsum, Plaster' },
      { id: 'Painting', label: 'Painting', desc: 'Int/Ext Decoration' },
      { id: 'Rainwater', label: 'Rainwater Goods', desc: 'Gutters, Downpipes' },
    ]
  },
  {
    title: "MEP Services",
    items: [
      { id: 'Electrical', label: 'Electrical', desc: 'Lighting, Power, Data' },
      { id: 'Plumbing', label: 'Plumbing', desc: 'Water, Drainage, Sanitary' },
      { id: 'Mechanical', label: 'Mechanical', desc: 'HVAC, Ventilation' },
      { id: 'Lifts', label: 'Vertical Transport', desc: 'Lifts / Elevators (High Rise)' },
    ]
  }
];

export const InstructionView: React.FC<InstructionViewProps> = ({ fileName, onStart, onCancel }) => {
  const [instructions, setInstructions] = useState('');
  
  // Building Parameters
  const [floorCount, setFloorCount] = useState(1);
  const [basementCount, setBasementCount] = useState(0);
  const [storyHeight, setStoryHeight] = useState(3.0);
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');

  // Default to selecting major structural elements including Formwork
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'Preliminaries', 'Excavation', 'Foundations', 'Columns', 'Beams', 'Slabs', 'Formwork', 'ExternalWorks'
  ]);
  
  const [includeRebar, setIncludeRebar] = useState(false);

  const handleSuggestionClick = (text: string) => {
    setInstructions(prev => prev ? `${prev}\n${text}` : text);
  };

  const toggleScope = (id: string) => {
    setSelectedScopes(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  const toggleAllInGroup = (groupIndex: number) => {
    const groupItems = SCOPE_GROUPS[groupIndex].items.map(i => i.id);
    const allSelected = groupItems.every(id => selectedScopes.includes(id));

    if (allSelected) {
      setSelectedScopes(prev => prev.filter(id => !groupItems.includes(id)));
    } else {
      setSelectedScopes(prev => [...Array.from(new Set([...prev, ...groupItems]))]);
    }
  };

  const handleUnitChange = (sys: 'metric' | 'imperial') => {
      setUnitSystem(sys);
      if (sys === 'imperial') {
          if (storyHeight === 3.0) setStoryHeight(10.0); // Approx 3m -> 10ft
      } else {
          if (storyHeight === 10.0) setStoryHeight(3.0);
      }
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[85vh]">
      
      {/* Left: Configuration */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-8 py-6 flex-shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <FolderOpen className="w-5 h-5 mr-2 text-brand-600" />
                Custom Takeoff Configuration
            </h2>
            <p className="text-slate-500 text-sm mt-1">
                Analyzing <strong>{fileName}</strong>. Select elements to measure.
            </p>
          </div>
          <div className="flex bg-white border border-slate-200 rounded-lg p-1">
             <button 
                onClick={() => handleUnitChange('metric')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${unitSystem === 'metric' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}
             >
                Metric (m)
             </button>
             <button 
                onClick={() => handleUnitChange('imperial')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${unitSystem === 'imperial' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}
             >
                Imperial (ft)
             </button>
          </div>
        </div>

        <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Building Definition */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide mb-4 flex items-center">
              <Layers className="w-4 h-4 mr-2 text-brand-500" />
              Building Definition
            </h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center">
                  <ArrowDownToLine className="w-3 h-3 mr-1" /> Basements
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    min={0} 
                    max={10}
                    value={basementCount}
                    onChange={(e) => setBasementCount(parseInt(e.target.value) || 0)}
                    className="w-full pl-3 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Floors (Above Ground)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    min={1} 
                    max={100}
                    value={floorCount}
                    onChange={(e) => setFloorCount(parseInt(e.target.value) || 1)}
                    className="w-full pl-3 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Avg. Story Height</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step={0.1}
                    value={storyHeight}
                    onChange={(e) => setStoryHeight(parseFloat(e.target.value) || (unitSystem === 'metric' ? 3.0 : 10.0))}
                    className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                      {unitSystem === 'metric' ? 'm' : 'ft'}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Supports High Rise & Low Rise projects.
            </p>
          </div>

          {/* Granular Scope Selector */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SCOPE_GROUPS.map((group, gIdx) => (
                <div key={gIdx} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{group.title}</h3>
                    <button 
                      onClick={() => toggleAllInGroup(gIdx)}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Toggle All
                    </button>
                  </div>
                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const isSelected = selectedScopes.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleScope(item.id)}
                          className={`w-full flex items-center space-x-3 p-2 rounded-lg text-left transition-all duration-200 border ${
                            isSelected 
                              ? 'bg-brand-50 border-brand-200 shadow-sm' 
                              : 'bg-white border-transparent hover:bg-slate-50'
                          }`}
                        >
                          <div className={`flex-shrink-0 ${isSelected ? 'text-brand-600' : 'text-slate-300'}`}>
                            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className={`block text-sm font-medium ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                              {item.label}
                            </span>
                            <span className="block text-xs text-slate-400">{item.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rebar Option */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-start space-x-3">
              <button 
                onClick={() => setIncludeRebar(!includeRebar)}
                className={`mt-1 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  includeRebar ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-300'
                }`}
              >
                {includeRebar && <CheckSquare className="w-3.5 h-3.5" />}
              </button>
              <div onClick={() => setIncludeRebar(!includeRebar)} className="cursor-pointer">
                <span className="block text-sm font-bold text-slate-800 flex items-center">
                  <Grid className="w-4 h-4 mr-2 text-slate-500" />
                  Generate Rebar Schedule
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Only select this if the uploaded file contains <strong>Structural Reinforcement Details</strong>. 
                </p>
              </div>
            </div>
          </div>

          {/* Text Instructions */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
              Specific Instructions
            </label>
            <textarea
              className="w-full h-24 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none text-slate-800 placeholder:text-slate-400 text-sm"
              placeholder="E.g., 'Exclude the garage area', 'Use C25 concrete for all slabs'..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.slice(0, 3).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 px-3 py-1.5 rounded-md border border-slate-200 transition-colors flex items-center"
                >
                  <MessageSquarePlus className="w-3 h-3 mr-1.5" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 flex justify-between items-center flex-shrink-0">
          <button
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-800 text-sm font-medium px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={() => onStart(instructions, selectedScopes, includeRebar, floorCount, basementCount, storyHeight, unitSystem)}
            disabled={selectedScopes.length === 0}
            className={`px-6 py-2.5 rounded-lg font-medium flex items-center shadow-sm transition-all ${
              selectedScopes.length === 0 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-700 text-white hover:shadow-md'
            }`}
          >
            <span>Start Analysis</span>
            <ChevronRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};
