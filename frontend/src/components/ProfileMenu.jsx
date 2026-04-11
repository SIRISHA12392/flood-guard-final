import React, { useState, useEffect, useRef } from 'react'

/**
 * ProfileMenu — circular avatar button with an animated dropdown.
 *
 * Props:
 *  user      {object}   – { username: string }
 *  onLogout  {fn}       – called when the user clicks Logout
 */
export default function ProfileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const initial = user?.username?.charAt(0).toUpperCase() || 'U'

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* ── Avatar button ── */}
      <button
        id="profile-menu-btn"
        onClick={() => setOpen(prev => !prev)}
        title={user ? `Logged in as ${user.username}` : 'Profile'}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          border: open ? '2px solid #00666c' : '2px solid transparent',
          background: 'linear-gradient(135deg, #00666c 0%, #76eef9 100%)',
          color: '#fff',
          fontWeight: 800,
          fontSize: '0.95rem',
          fontFamily: "'Inter', sans-serif",
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          flexShrink: 0,
          transition: 'border 0.15s ease, box-shadow 0.15s ease',
          boxShadow: open
            ? '0 0 0 3px rgba(0,102,108,0.2)'
            : '0 2px 8px rgba(0,0,0,0.12)',
        }}
      >
        {initial}
      </button>

      {/* ── Dropdown ── */}
      <div
        className="profile-menu"
        style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          width: '220px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(36,47,65,0.16), 0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid rgba(36,47,65,0.08)',
          overflow: 'hidden',
          zIndex: 99999,
          // Smooth show/hide animation
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.97)',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header — username */}
        <div
          style={{
            padding: '14px 18px 12px',
            background: 'linear-gradient(135deg, rgba(0,102,108,0.06) 0%, rgba(118,238,249,0.08) 100%)',
            borderBottom: '1px solid rgba(36,47,65,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Mini avatar */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00666c 0%, #76eef9 100%)',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {initial}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#00666c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Signed in as
              </p>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#111827', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.username || 'User'}
              </p>
            </div>
          </div>
        </div>



        {/* Logout */}
        <div style={{ padding: '8px 0 10px' }}>
          <MenuItem
            icon="logout"
            label="Logout"
            danger
            onClick={() => { setOpen(false); onLogout() }}
          />
        </div>
      </div>
    </div>
  )
}

/* ── Internal helper: a single dropdown row ── */
function MenuItem({ icon, label, active = false, activeColor = '#00666c', danger = false, onClick }) {
  const [hovered, setHovered] = useState(false)

  const color = danger
    ? (hovered ? '#b91c1c' : '#ef4444')
    : active
      ? activeColor
      : hovered
        ? '#111827'
        : '#374151'

  const bg = danger
    ? (hovered ? 'rgba(185,28,28,0.07)' : 'transparent')
    : active
      ? `${activeColor}14`
      : hovered
        ? 'rgba(0,102,108,0.05)'
        : 'transparent'

  return (
    <button
      className="profile-menu-item"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 18px',
        background: bg,
        border: 'none',
        cursor: 'pointer',
        color,
        fontSize: '0.875rem',
        fontWeight: active || danger ? 700 : 500,
        fontFamily: "'Inter', sans-serif",
        textAlign: 'left',
        transition: 'background 0.12s ease, color 0.12s ease',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '18px', flexShrink: 0, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
      >
        {icon}
      </span>
      {label}
      {active && (
        <span
          style={{
            marginLeft: 'auto',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: activeColor,
            flexShrink: 0,
          }}
        />
      )}
    </button>
  )
}
