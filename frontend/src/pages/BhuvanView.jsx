import React from 'react';
import { useNavigate } from 'react-router-dom';

const BhuvanView = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full h-[100vh] bg-slate-50 dark:bg-slate-900 override-height-100">
      {/* Top Navigation Bar */}
      <nav className="flex items-center justify-between px-6 py-3 bg-white/90 dark:bg-slate-900/96 border-b border-primary/20 shadow-sm backdrop-blur-md shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button 
            className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary-dim dark:text-primary-fixed px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors"
            onClick={() => navigate("/home")}
          >
            ← Back to Dashboard
          </button>
          <span className="text-secondary dark:text-secondary-fixed font-bold text-base hidden sm:block">
            ISRO Data Integration
          </span>
        </div>
        <div className="flex-1 text-center">
          <span className="text-base font-bold text-slate-800 dark:text-slate-100">
            Bhuvan Geo-Platform
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            LIVE
          </div>
        </div>
      </nav>

      {/* Embedded ISRO Portal */}
      <div className="flex-1 w-full bg-slate-200 dark:bg-slate-800 relative z-10 overflow-hidden">
        <iframe 
          src="https://bhuvan.nrsc.gov.in/home/index.php" 
          title="ISRO Bhuvan Geo Platform"
          className="w-full h-full border-none"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        />
      </div>
    </div>
  );
};

export default BhuvanView;
