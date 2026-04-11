// src/TerrainIntegrity.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  soilMoistureData,
  slopeStabilityData,
  geologicalZones,
  mlPredictions,
} from './data/terrainData'

// ── Risk color helper ──────────────────────────────────────────────────────
const getRiskColor = (risk) => {
  const map = {
    CRITICAL: { bg: 'rgba(124,58,237,0.2)',  text: '#a78bfa', border: 'rgba(124,58,237,0.4)' },
    HIGH:     { bg: 'rgba(239,68,68,0.2)',   text: '#f87171', border: 'rgba(239,68,68,0.4)'  },
    MEDIUM:   { bg: 'rgba(245,158,11,0.2)',  text: '#fbbf24', border: 'rgba(245,158,11,0.4)' },
    LOW:      { bg: 'rgba(34,197,94,0.2)',   text: '#4ade80', border: 'rgba(34,197,94,0.4)'  },
  }
  return map[risk] || map.LOW
}

// ── Small reusable LIVE badge ──────────────────────────────────────────────
const LiveBadge = () => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
    padding: '4px 10px', borderRadius: 20,
    fontSize: 11, fontWeight: 700, color: '#4ade80',
  }}>
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: '#22c55e', boxShadow: '0 0 8px #22c55e',
      animation: 'livePulse 1.5s infinite',
    }} />
    LIVE
  </div>
)

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const TerrainIntegrity = () => {
  const navigate = useNavigate()
  const [activeZone, setActiveZone]   = useState(null)
  const [refreshing, setRefreshing]   = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => { setLastUpdated(new Date()); setRefreshing(false) }, 1500)
  }

  // Terrain surveillance images (Unsplash – no API key needed)
  const terrainImages = [
    {
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
      label: 'High Slope Detection',
      sublabel: 'Western Ghats Sector',
      risk: 'HIGH',
    },
    {
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80',
      label: 'Geological Stress Zone',
      sublabel: 'Active Monitoring',
      risk: 'CRITICAL',
    },
    {
      url: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=600&q=80',
      label: 'Soil Saturation Area',
      sublabel: 'Coastal Slopes',
      risk: 'MEDIUM',
    },
  ]

  // Quick-stat cards
  const stats = [
    { emoji: '⚠️', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   value: '4',     label: 'Active Risk Zones', sub: '+2 from yesterday' },
    { emoji: '💧', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  value: '82%',   label: 'Avg Soil Moisture',  sub: 'Above threshold'   },
    { emoji: '⛰️', color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  value: '42°',   label: 'Max Slope Angle',    sub: 'Western Ghats'     },
    { emoji: '🤖', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  value: '95.1%', label: 'ML Accuracy',        sub: 'Gradient Boost'    },
  ]

  // Emergency protocols
  const protocols = [
    {
      step: '01', color: '#ef4444', icon: '🚨',
      title: 'Immediate Evacuation',
      desc: 'Move residents from high-slope areas to designated assembly points. Follow NDMA guidelines.',
    },
    {
      step: '02', color: '#f59e0b', icon: '🚧',
      title: 'Road Blockades',
      desc: 'Close mountain roads and ghat sections. Deploy traffic police and barricades immediately.',
    },
    {
      step: '03', color: '#22c55e', icon: '🏥',
      title: 'Safe Zone Assembly',
      desc: 'Direct population to 12 identified safe zones within 5 km radius of affected areas.',
    },
  ]

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 pb-10">

      {/* Global animations */}
      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spinIcon  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .ti-zonecard:hover {
          border-color: rgba(251,146,60,.5) !important;
          background: rgba(251,146,60,.06) !important;
        }
        .ti-imgcard:hover img { transform: scale(1.05); }
        .ti-imgcard img { transition: transform .4s ease; }
      `}</style>

      {/* ════════════════ NAVBAR ════════════════ */}
      <nav className="flex items-center justify-between px-7 py-3.5 bg-white/90 dark:bg-slate-900/96 border-b border-orange-400/20 shadow-sm backdrop-blur-md sticky top-0 z-[100]">
        {/* Left – back button + breadcrumb */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 bg-orange-400/10 hover:bg-orange-400/20 border border-orange-400/30 text-orange-500 px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors"
          >
            ← Back to Dashboard
          </button>
          <span className="text-slate-400">›</span>
          <span className="text-slate-500 dark:text-slate-400 text-sm">Terrain Integrity</span>
        </div>

        {/* Centre – logo */}
        <span className="text-xl font-black bg-gradient-to-r from-teal-600 to-cyan-500 dark:from-teal-400 dark:to-cyan-300 bg-clip-text text-transparent tracking-tight">
          Flood Guard
        </span>

        {/* Right – timestamp + refresh + live */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg flex items-center transition-colors"
            title="Refresh"
          >
            <span style={refreshing ? { display: 'inline-block', animation: 'spinIcon 1s linear infinite' } : {}}>
              ↻
            </span>
          </button>
          <LiveBadge />
        </div>
      </nav>

      {/* ════════════════ ALERT BANNER ════════════════ */}
      <div className="flex items-center gap-3.5 bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/40 rounded-xl p-4 mx-7 my-4 shadow-sm">
        <div className="bg-red-500/20 p-2.5 rounded-lg text-2xl shrink-0">
          ⚠️
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">
            ACTIVE LANDSLIDE RISK — Mumbai Metropolitan Region
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            ML models detect elevated geological stress in Western Ghats Sector.
            Soil moisture at <strong className="text-orange-500">82%</strong> — exceeding safety
            threshold of 75%. Evacuation advisories issued for Zone C &amp; D.
          </div>
        </div>
        <button className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 px-3.5 py-1.5 rounded-lg text-sm font-bold shrink-0 transition-colors">
          View Advisory
        </button>
      </div>

      {/* ════════════════ HERO SECTION ════════════════ */}
      <div className="px-7 pt-7 pb-6 bg-gradient-to-b from-orange-500/5 to-transparent border-b border-orange-500/5">
        <div className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-bold tracking-wide mb-3">
          ⛰️ TERRAIN INTEGRITY MODULE
        </div>

        <h1 className="text-3xl font-black mb-2.5 bg-gradient-to-br from-orange-600 to-amber-500 dark:from-orange-400 dark:to-amber-300 bg-clip-text text-transparent leading-tight">
          Geological Stress Detection<br />
          &amp; Landslide Prevention
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed m-0">
          Real-time soil moisture analysis, slope stability monitoring, and ML-powered
          landslide prediction for high-risk zones across Mumbai Metropolitan Region.
        </p>
      </div>

      {/* ════════════════ STAT CARDS ════════════════ */}
      <div className="grid grid-cols-4 gap-3.5 px-7 py-5">
        {stats.map((s, i) => (
          <div key={i} className="flex items-center gap-3.5 bg-white dark:bg-slate-800/80 border border-orange-500/15 rounded-xl p-4 shadow-sm backdrop-blur-md">
            <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-2xl" style={{ background: s.bg }}>
              {s.emoji}
            </div>
            <div>
              <div className="text-2xl font-black leading-none" style={{ color: s.color }}>
                {s.value}
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 mb-0.5">
                {s.label}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ════════════════ TERRAIN IMAGES ════════════════ */}
      <div className="px-7">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">👁️</span>
          <h2 className="text-lg font-extrabold m-0 text-slate-800 dark:text-slate-100">Terrain Surveillance</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
            — Live satellite &amp; sensor imagery
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3.5">
          {terrainImages.map((img, i) => {
            const rc = getRiskColor(img.risk)
            return (
              <div key={i} className="ti-imgcard relative h-48 rounded-xl overflow-hidden cursor-pointer shadow-sm border border-slate-200 dark:border-slate-700/50">
                <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-3.5 pt-5 pb-3">
                  <div className="text-sm font-bold text-white mb-1">
                    {img.label}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">{img.sublabel}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>
                      {img.risk}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ════════════════ CHARTS + ZONES + ML ════════════════ */}
      <div className="grid grid-cols-2 gap-4 px-7 py-4">

        {/* ── Soil Moisture Chart ── */}
        <div className="bg-white dark:bg-slate-800/80 border border-orange-500/15 rounded-2xl p-5 shadow-sm backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-100">
              💧 Soil Moisture (24 hr)
            </div>
            <LiveBadge />
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={soilMoistureData}>
              <defs>
                <linearGradient id="moistGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700/50" />
              <XAxis dataKey="time" className="stroke-slate-400 dark:stroke-slate-500 text-xs" />
              <YAxis className="stroke-slate-400 dark:stroke-slate-500 text-xs" unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderColor: "rgba(251,146,60,.3)",
                  borderRadius: "8px", color: "#f1f5f9",
                  fontSize: "12px"
                }}
              />
              <Area
                dataKey="moisture" stroke="#3b82f6"
                fill="url(#moistGrad)" strokeWidth={2.5}
                name="Moisture %" dot={{ r: 3, fill: '#3b82f6' }}
              />
              <Area
                dataKey="threshold" stroke="#ef4444"
                fill="none" strokeDasharray="5 5"
                strokeWidth={2} name="Safe Threshold"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Slope Stability Chart ── */}
        <div className="bg-white dark:bg-slate-800/80 border border-orange-500/15 rounded-2xl p-5 shadow-sm backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-100">
              📊 Slope Stability by Zone
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">6 zones monitored</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={slopeStabilityData} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700/50" />
              <XAxis dataKey="zone" className="stroke-slate-400 dark:stroke-slate-500 text-xs" />
              <YAxis className="stroke-slate-400 dark:stroke-slate-500 text-xs" unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderColor: "rgba(251,146,60,.3)",
                  borderRadius: "8px", color: "#f1f5f9",
                  fontSize: "12px"
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="stability" fill="#22c55e" radius={[4,4,0,0]} name="Stability %" />
              <Bar dataKey="risk"      fill="#ef4444" radius={[4,4,0,0]} name="Risk %"      />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Geological Risk Zones ── */}
        <div className="bg-white dark:bg-slate-800/80 border border-orange-500/15 rounded-2xl p-5 shadow-sm backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-100">
              📍 Geological Risk Zones
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Mumbai Region</span>
          </div>

          {geologicalZones.map((zone) => {
            const rc   = getRiskColor(zone.risk)
            const open = activeZone === zone.id
            return (
              <div
                key={zone.id}
                className={`ti-zonecard p-3 mb-2.5 flex items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 ${open ? 'border' : 'border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/40'}`}
                onClick={() => setActiveZone(open ? null : zone.id)}
                style={{
                  borderColor: open ? zone.color : undefined,
                  backgroundColor: open ? `${zone.color}15` : undefined
                }}
              >
                {/* colour dot */}
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: zone.color, boxShadow: `0 0 8px ${zone.color}` }} />

                <div className="flex-1">
                  {/* name + badge */}
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{zone.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>
                      {zone.risk}
                    </span>
                  </div>
                  {/* progress bar */}
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/50 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${zone.riskLevel}%`, background: `linear-gradient(90deg,${zone.color}70,${zone.color})` }}
                    />
                  </div>
                  {/* expanded details */}
                  {open && (
                    <div className="grid grid-cols-3 gap-2 mt-2.5">
                      {[
                        { label: 'Slope',     value: zone.slope    },
                        { label: 'Moisture',  value: zone.moisture  },
                        { label: 'Soil Type', value: zone.soilType  },
                      ].map((d, di) => (
                        <div key={di} className="bg-slate-100 dark:bg-slate-800/50 p-2 rounded-lg text-center">
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                            {d.label}
                          </div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{d.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* chevron */}
                <span className={`text-slate-400 shrink-0 text-sm transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
                  ›
                </span>
              </div>
            )
          })}
        </div>

        {/* ── ML Predictions ── */}
        <div className="bg-white dark:bg-slate-800/80 border border-orange-500/15 rounded-2xl p-5 shadow-sm backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-100">
              🤖 ML Model Predictions
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">4 models active</span>
          </div>

          {/* ensemble result box */}
          <div className="p-3.5 mb-3.5 bg-gradient-to-br from-red-500/10 to-purple-500/10 border border-red-500/20 rounded-xl">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              ENSEMBLE PREDICTION (3 / 4 models agree)
            </div>
            <div className="text-xl font-black text-red-600 dark:text-red-400">
              🔴 HIGH LANDSLIDE RISK
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Next 6 hours — Western Ghats Sector
            </div>
          </div>

          {/* individual model rows */}
          {mlPredictions.map((ml, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-900/60 border border-indigo-500/20 rounded-xl px-3.5 py-2.5 mb-2">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                  {ml.model}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {ml.accuracy}% accuracy
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-xs font-bold ${ml.prediction.includes('HIGH') ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {ml.prediction}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Confidence:</span>
                  <div className="w-14 h-1.5 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" style={{ width: `${ml.confidence}%` }} />
                  </div>
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-400">
                    {ml.confidence}%
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* features list */}
          <div className="bg-slate-100 dark:bg-slate-900/40 rounded-xl p-3 mt-1">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wide mb-2">
              KEY FEATURES USED BY MODELS
            </div>
            {[
              'Soil Moisture Index (SMI)',
              'Slope Angle & Aspect',
              'Rainfall Intensity (72 hr)',
              'NDVI Vegetation Cover',
              'Historical Landslide Events',
            ].map((feat, fi, arr) => (
              <div key={fi} className={`flex items-center gap-2 py-1 ${fi < arr.length - 1 ? 'border-b border-slate-200 dark:border-slate-700/50' : ''}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                <span className="text-xs text-slate-600 dark:text-slate-400">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Emergency Protocols (full width) ── */}
        <div className="col-span-full bg-white dark:bg-slate-800/80 border border-orange-500/15 rounded-2xl p-5 shadow-sm backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-100">
              🛡️ Emergency Protocols &amp; Safety Guidelines
            </div>
            <button className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-3.5 py-1.5 rounded-lg text-sm font-bold cursor-pointer hover:bg-red-500/20 transition-colors">
              🔔 Activate Alert
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3.5">
            {protocols.map((p, pi) => (
              <div key={pi} className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border" style={{ borderColor: `${p.color}30` }}>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <div className="text-[10px] font-extrabold tracking-wide" style={{ color: p.color }}>
                      STEP {p.step}
                    </div>
                    <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{p.title}</div>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed m-0">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>{/* end charts grid */}

      {/* ════════════════ FOOTER ════════════════ */}
      <div className="text-center px-7 py-5 border-t border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 text-xs mt-4">
        Flood Guard • Terrain Integrity Module •
        Data refreshed every 15 min •
        Powered by IMD, ISRO Bhuvan &amp; NDMA sensors
      </div>
    </div>
  )
}

export default TerrainIntegrity
