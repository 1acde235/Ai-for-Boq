
import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8", showText = false }) => {
  return (
    <div className="flex items-center gap-2">
      <svg 
        viewBox="0 0 100 100" 
        className={className} 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* The U / B Base Container */}
        <path 
          d="M15 20 V 70 C 15 90, 85 90, 85 70 V 20" 
          stroke="currentColor" 
          strokeWidth="8" 
          strokeLinecap="round" 
          className="text-brand-700"
        />
        
        {/* The T / Top Bar */}
        <path 
          d="M10 20 H 90" 
          stroke="currentColor" 
          strokeWidth="8" 
          strokeLinecap="round" 
          className="text-brand-700"
        />

        {/* The H / Vertical Pillars */}
        <path 
          d="M35 20 V 85" 
          stroke="currentColor" 
          strokeWidth="6" 
          className="text-brand-500"
        />
        <path 
          d="M65 20 V 85" 
          stroke="currentColor" 
          strokeWidth="6" 
          className="text-brand-500"
        />

        {/* The A / M / W Cross Bracing (Truss System) */}
        <path 
          d="M35 80 L 50 50 L 65 80" 
          stroke="#f59e0b" // Amber/Construction Orange
          strokeWidth="5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M35 20 L 50 50 L 65 20" 
          stroke="#f59e0b" // Amber/Construction Orange
          strokeWidth="5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        
        {/* Central Axis Point */}
        <circle cx="50" cy="50" r="4" fill="#f59e0b" />
      </svg>
      
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-700 to-brand-500">
            ConstructAI
          </span>
          <span className="text-[8px] tracking-[0.2em] text-slate-400 font-medium uppercase">
            ABHMTW.U
          </span>
        </div>
      )}
    </div>
  );
};
