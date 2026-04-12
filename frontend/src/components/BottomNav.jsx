import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

/* ── Inline SVG Icons (crisp, no font dependency) ────────────────── */
const Icons = {
  dashboard: (className) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor"/>
    </svg>
  ),
  map: (className) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" fill="currentColor" fillOpacity="0.1" stroke="currentColor"/>
      <line x1="9" y1="3" x2="9" y2="18"/>
      <line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  ),
  sos: () => (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
      <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      <rect x="10.5" y="6" width="3" height="12" rx="1.5" fill="white"/>
      <rect x="6" y="10.5" width="12" height="3" rx="1.5" fill="white"/>
    </svg>
  ),
  safezones: (className) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2 L20 6 L20 12 C20 16.4 16.4 20.4 12 22 C7.6 20.4 4 16.4 4 12 L4 6 Z" fill="currentColor" fillOpacity="0.12" stroke="currentColor"/>
      <polyline points="8.5,12 11,14.5 15.5,10" strokeWidth="2.2"/>
    </svg>
  ),
  logs: (className) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="5" y="3" width="14" height="18" rx="2" fill="currentColor" fillOpacity="0.1" stroke="currentColor"/>
      <line x1="9" y1="8"  x2="15" y2="8"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  ),
}

/* ── Tabs config ─────────────────────────────────────────────────── */
const TABS = [
  { label: 'Dashboard', path: '/home',       iconKey: 'dashboard' },
  { label: 'Maps',      path: '/map',         iconKey: 'map'       },
  { label: 'SOS',       action: 'sos',        iconKey: 'sos', isSos: true },
  { label: 'Safe Zones',path: '/safe-zones',  iconKey: 'safezones' },
  { label: 'Logs',      path: '/logs',        iconKey: 'logs'      },
]

export default function BottomNav() {
  const navigate  = useNavigate()
  const { pathname } = useLocation()

  if (['/login', '/register', '/'].includes(pathname)) return null

  return (
    <nav
      className="bottom-nav fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-black/5 dark:border-white/5 shadow-[0_-8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)] z-[5000] flex justify-around items-center px-2 py-3 transition-colors duration-300 dark:backdrop-blur-xl dark:bg-slate-900/95"
      style={{
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))'
      }}
    >
      {TABS.map((tab, idx) => {
        if (tab.isSos) {
          return (
            <a
              role="button"
              key="sos"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openEmergencyModal'))
                if (window.openEmergencyModal) window.openEmergencyModal()
              }}
              className="sos-trigger flex flex-col items-center justify-center bg-transparent border-none p-0 relative -top-3 cursor-pointer group"
            >
              <div 
                className="flex items-center justify-center w-14 h-14 rounded-full mb-1 bg-gradient-to-br from-red-600 to-red-500 shadow-[0_4px_20px_rgba(220,38,38,0.5)] dark:shadow-[0_4px_20px_rgba(220,38,38,0.3)] transition-transform duration-200 group-hover:scale-110"
              >
                {Icons.sos()}
              </div>
              <span className="text-[10px] font-extrabold tracking-wide text-red-600 dark:text-red-500">
                SOS
              </span>
            </a>
          )
        }

        const isActive = tab.path && pathname.startsWith(tab.path)
        
        return (
          <a
            role="button"
            key={tab.path || idx}
            onClick={() => tab.path && navigate(tab.path)}
            className="flex flex-col items-center justify-center bg-transparent border-none cursor-pointer p-1.5 rounded-xl min-w-[56px] transition-all duration-200"
          >
            {/* Icon Container */}
            <div className={`flex items-center justify-center w-11 h-8 rounded-lg mb-1 transition-all duration-300
              ${isActive 
                ? 'bg-primary/20 text-primary dark:bg-red-500/15 dark:text-red-500 dark:drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]' 
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-slate-300'
              }
            `}>
              {Icons[tab.iconKey]('w-6 h-6 transition-transform duration-300 ' + (isActive ? 'scale-110' : 'scale-100'))}
            </div>

            {/* Label */}
            <span className={`text-[10px] tracking-wide transition-all duration-300
              ${isActive 
                ? 'font-extrabold text-primary dark:text-red-500 dark:drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]' 
                : 'font-medium text-slate-500 dark:text-slate-400'
              }
            `}>
              {tab.label}
            </span>

            {/* Subtle dot indicator for dark mode active state to give it a premium feel */}
            {isActive && (
              <div className="hidden dark:block w-1 h-1 rounded-full bg-red-500 mt-1 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
            )}
          </a>
        )
      })}
    </nav>
  )
}
