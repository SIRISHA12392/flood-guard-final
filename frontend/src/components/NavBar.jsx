import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Shared top navigation bar for all authenticated pages.
 * Now only shows the brand logo and right-side slot (profile menu, etc).
 * Navigation tabs are handled by BottomNav on mobile.
 *
 * Props:
 *  - rightSlot  {node}  – optional extra controls rendered on the right
 *                         (e.g. Emergency Call button, search bar)
 */
export default function NavBar({ rightSlot }) {
  const navigate     = useNavigate()
  const { pathname } = useLocation()

  // Do not render on auth pages
  if (['/login', '/register', '/'].includes(pathname)) return null

  return (
    <header
      className="sticky top-0 z-[1000] font-headline bg-[#f4f6ff] dark:bg-[#111827] border-b border-black/5 dark:border-white/5 shadow-sm transition-colors duration-300"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1536px',
          margin: '0 auto',
          padding: '0 24px',
          height: '60px',
        }}
      >
        {/* Brand */}
        <span
          onClick={() => navigate('/home')}
          style={{
            fontSize: '1.25rem',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(90deg, #00666c 0%, #76eef9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          Flood Guard
        </span>

        {/* Right slot: profile menu, emergency button, etc. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {rightSlot}
        </div>
      </div>
    </header>
  )
}
