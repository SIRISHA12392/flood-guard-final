import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ─── Mock real-time data (replace fetch URLs with your Flask API) ───────────
const MOCK_SHELTERS = [
  { id: 1, name: "Government Higher Secondary School", area: "Sathankulam", capacity: 500, current: 120, dist: "1.2 km", status: "open", lat: 8.409, lng: 77.913, type: "school" },
  { id: 2, name: "Tirunelveli District Collector Office", area: "Tirunelveli", capacity: 800, current: 340, dist: "3.8 km", status: "open", lat: 8.727, lng: 77.693, type: "govt" },
  { id: 3, name: "Pettai Community Hall", area: "Pettai", capacity: 200, current: 190, dist: "5.1 km", status: "full", lat: 8.731, lng: 77.714, type: "hall" },
  { id: 4, name: "NDRF Relief Camp - Palayamkottai", area: "Palayamkottai", capacity: 1200, current: 450, dist: "6.3 km", status: "open", lat: 8.711, lng: 77.755, type: "ndrf" },
  { id: 5, name: "St. Xavier's College Ground", area: "Tirunelveli", capacity: 600, current: 80, dist: "4.2 km", status: "open", lat: 8.724, lng: 77.698, type: "school" },
];

const MOCK_ROUTES = [
  { id: 1, name: "Route A – NH44 Bypass", risk: "low", time: "12 min", distance: "8.4 km", via: "Palayamkottai Road → NH44", status: "clear", steps: ["Head north on Main Road", "Turn right onto Palayamkottai Road", "Merge onto NH44 northbound", "Exit at Tirunelveli Junction", "Arrive at NDRF Camp"] },
  { id: 2, name: "Route B – East Coast Road", risk: "medium", time: "18 min", distance: "11.2 km", via: "ECR → Coastal Highway", status: "caution", steps: ["Head east on Beach Road", "Turn left at ECR Junction", "Continue straight for 7km", "Watch for waterlogging near km 5", "Turn right to shelter"] },
  { id: 3, name: "Route C – Bypass via Nellai", risk: "high", time: "31 min", distance: "16.8 km", via: "Old Nellai Road (FLOODED – AVOID)", status: "blocked", steps: ["ROUTE BLOCKED", "Flood water reported at 3 points", "Do not attempt this route", "Use Route A instead"] },
];

const MOCK_ALERTS = [
  { id: 1, level: "critical", time: "14 min ago", msg: "Flash flood warning issued for Tamirabarani River basin. Water level at 92% capacity.", icon: "🚨" },
  { id: 2, level: "warning", time: "32 min ago", msg: "Landslide risk elevated in Kalakad hills due to 180mm rainfall in last 6 hours.", icon: "⚠️" },
  { id: 3, level: "info", time: "1 hr ago", msg: "NDRF team deployed at Palayamkottai. 4 rescue boats operational.", icon: "ℹ️" },
  { id: 4, level: "info", time: "2 hr ago", msg: "IMD issues orange alert for Tirunelveli district. Expected 120mm rain in next 12 hrs.", icon: "🌧️" },
];

const SAFETY_DOS = [
  "Move to higher ground immediately when warned",
  "Carry a 72-hour emergency kit (water, food, medicine, torch)",
  "Keep your phone charged and tune into All India Radio",
  "Follow NDRF/SDRF official evacuation instructions",
  "Help elderly and disabled neighbours evacuate first",
  "Store drinking water in clean containers before evacuation",
];

const SAFETY_DONTS = [
  "Do NOT walk or drive through floodwater (6 inches can knock you down)",
  "Do NOT return home until authorities declare it safe",
  "Do NOT touch electrical equipment in wet areas",
  "Do NOT use candles near gas leaks post-flood",
  "Do NOT ignore landslide warning signs (cracking soil, tilting trees)",
  "Do NOT block drainage channels or low-lying roads",
];

// ─── Risk Level Indicator ─────────────────────────────────────────────────
const riskColors = { low: "#1D9E75", medium: "#EF9F27", high: "#e24b4a", critical: "#e24b4a" };
const riskBg = { low: "rgba(29,158,117,0.15)", medium: "rgba(239,159,39,0.15)", high: "rgba(226,75,74,0.15)", critical: "rgba(226,75,74,0.2)" };

export default function SafeZones() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("shelters");
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [riskLevel, setRiskLevel] = useState("medium");
  const [riverLevel, setRiverLevel] = useState(72);
  const [rainfallMm, setRainfallMm] = useState(94);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [alertExpanded, setAlertExpanded] = useState(null);
  const [dosDontsTab, setDosDontsTab] = useState("dos");
  const [animIn, setAnimIn] = useState(false);
  const timerRef = useRef(null);

  // Simulate real-time sensor updates
  useEffect(() => {
    setAnimIn(true);
    timerRef.current = setInterval(() => {
      setRiverLevel(prev => Math.min(99, Math.max(50, prev + (Math.random() * 4 - 1.5))));
      setRainfallMm(prev => Math.min(200, Math.max(20, prev + (Math.random() * 6 - 2))));
      setLastUpdated(new Date());
    }, 8000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (riverLevel >= 90 || rainfallMm >= 150) setRiskLevel("critical");
    else if (riverLevel >= 75 || rainfallMm >= 100) setRiskLevel("high");
    else if (riverLevel >= 60 || rainfallMm >= 60) setRiskLevel("medium");
    else setRiskLevel("low");
  }, [riverLevel, rainfallMm]);

  // Fetch from Flask API (replace with real endpoint)
  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const res = await fetch("/api/sensor-status", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.river_level) setRiverLevel(data.river_level);
          if (data.rainfall_mm) setRainfallMm(data.rainfall_mm);
        }
      } catch {}
    };
    fetchSensorData();
  }, []);

  const filteredShelters = MOCK_SHELTERS.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.area.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchFilter;
  });

  const capacityPercent = (s) => Math.round((s.current / s.capacity) * 100);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e1a] text-slate-800 dark:text-[#e8f5f1] font-sans relative overflow-x-hidden transition-colors duration-300 pb-10">
      {/* Animated bg pulse */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', transition: 'opacity 2s ease', zIndex: 0, opacity: riskLevel === "critical" ? 0.18 : 0.08, background: `radial-gradient(ellipse at 70% 30%, ${riskColors[riskLevel]}, transparent 60%)` }} />

      {/* ── NAVBAR ── */}
      <nav className="flex items-center justify-between px-6 py-3 bg-white/90 dark:bg-[#0a0e1a]/97 border-b border-emerald-500/20 shadow-sm backdrop-blur-md sticky top-0 z-[100] flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-[#8ab0a5] text-sm px-3.5 py-1.5 cursor-pointer font-medium transition-colors" onClick={() => navigate("/home")}>← Back</button>
          <span className="text-emerald-700 dark:text-[#1D9E75] font-bold text-base">💧 Flood Guard</span>
        </div>
        <div className="flex-1 text-center">
          <span className="text-base font-bold text-slate-800 dark:text-[#e8f5f1]">Safe Zones &amp; Protocols</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold tracking-wide" style={{ background: riskBg[riskLevel], border: `1px solid ${riskColors[riskLevel]}`, color: riskColors[riskLevel] }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: riskColors[riskLevel], animation: riskLevel === "critical" ? "blink 0.8s infinite" : "pulse 2s infinite" }} />
            {riskLevel.toUpperCase()} RISK
          </div>
          <div className="text-slate-500 dark:text-[#4a7a6a] text-xs">Updated {lastUpdated.toLocaleTimeString()}</div>
        </div>
      </nav>

      {/* ── LIVE SENSOR BANNER ── */}
      <div className="flex items-center px-6 py-3 bg-white dark:bg-[#0d1b2a]/80 shadow-sm border-b border-slate-200 dark:border-[#0d1b2a] flex-wrap relative z-10" style={{ borderBottomColor: riskColors[riskLevel] }}>
        <div className="flex-1 min-w-[120px] px-5 flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 dark:text-[#4a7a6a] tracking-[1.5px] font-bold">🌊 RIVER LEVEL</span>
          <span className="text-xl font-extrabold" style={{ color: riverLevel > 85 ? "#e24b4a" : riverLevel > 65 ? "#EF9F27" : "#1D9E75" }}>
            {riverLevel.toFixed(1)}%
          </span>
          <div className="h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-2000" style={{ width: `${riverLevel}%`, background: riverLevel > 85 ? "#e24b4a" : riverLevel > 65 ? "#EF9F27" : "#1D9E75" }} />
          </div>
        </div>
        <div className="w-px h-12 bg-slate-200 dark:bg-white/10 self-center" />
        <div className="flex-1 min-w-[120px] px-5 flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 dark:text-[#4a7a6a] tracking-[1.5px] font-bold">🌧️ RAINFALL (6HR)</span>
          <span className="text-xl font-extrabold" style={{ color: rainfallMm > 120 ? "#e24b4a" : rainfallMm > 80 ? "#EF9F27" : "#1D9E75" }}>
            {rainfallMm.toFixed(0)} mm
          </span>
          <div className="h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-2000" style={{ width: `${Math.min(100, (rainfallMm / 200) * 100)}%`, background: rainfallMm > 120 ? "#e24b4a" : rainfallMm > 80 ? "#EF9F27" : "#1D9E75" }} />
          </div>
        </div>
        <div className="w-px h-12 bg-slate-200 dark:bg-white/10 self-center" />
        <div className="flex-1 min-w-[120px] px-5 flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 dark:text-[#4a7a6a] tracking-[1.5px] font-bold">🏔️ LANDSLIDE INDEX</span>
          <span className="text-xl font-extrabold text-[#EF9F27]">ELEVATED</span>
          <div className="h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-2000 w-[68%] bg-[#EF9F27]" />
          </div>
        </div>
        <div className="w-px h-12 bg-slate-200 dark:bg-white/10 self-center" />
        <div className="flex-1 min-w-[120px] px-5 flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 dark:text-[#4a7a6a] tracking-[1.5px] font-bold">📡 SENSORS ONLINE</span>
          <span className="text-xl font-extrabold text-[#1D9E75]">84 / 89</span>
          <div className="h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-2000 w-[94%] bg-[#1D9E75]" />
          </div>
        </div>
      </div>

      {/* ── ACTIVE ALERTS ── */}
      <div className="px-6 py-3 flex flex-col gap-2 relative z-10">
        {MOCK_ALERTS.map(alert => (
          <div
            key={alert.id}
            className="flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all hover:bg-black/5 dark:hover:bg-white/5"
            style={{ background: riskBg[alert.level], borderLeftWidth: 3, borderLeftColor: riskColors[alert.level] || "#1D9E75", borderColor: 'rgba(150,150,150,0.1)' }}
            onClick={() => setAlertExpanded(alertExpanded === alert.id ? null : alert.id)}
          >
            <span className="text-base">{alert.icon}</span>
            <div className="flex-1">
              <div className="text-sm text-slate-800 dark:text-[#c0d8d0] font-medium leading-tight">{alert.msg}</div>
              {alertExpanded === alert.id && (
                <div className="mt-2">
                  <p className="m-0 text-xs text-slate-500 dark:text-[#8ab0a5] mt-1.5">
                    Source: NDMA / IMD Automated Sensor Network · {alert.time} · Verified ✓
                  </p>
                  <p className="m-0 text-xs text-slate-500 dark:text-[#8ab0a5] mt-1">
                    Affected Districts: Tirunelveli, Thoothukudi · Priority: {alert.level.toUpperCase()}
                  </p>
                </div>
              )}
            </div>
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: riskColors[alert.level] || "#6b9e8e" }}>{alert.time}</span>
            <span className="text-slate-400 dark:text-[#6b9e8e] text-xs ml-1">{alertExpanded === alert.id ? "▲" : "▼"}</span>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-0 px-6 bg-white dark:bg-[#0a0e1a]/90 border-b border-slate-200 dark:border-white/10 overflow-x-auto relative z-10 shadow-sm">
        {[
          { key: "shelters", label: "🏠 Emergency Shelters" },
          { key: "routes", label: "🗺️ Evacuation Routes" },
          { key: "safety", label: "✅ Safety Protocols" },
          { key: "contacts", label: "📞 Emergency Contacts" },
        ].map(tab => (
          <button
            key={tab.key}
            className={`bg-transparent border-0 border-b-2 text-sm px-5 py-3.5 cursor-pointer whitespace-nowrap transition-all ${activeTab === tab.key ? 'text-emerald-600 dark:text-[#1D9E75] border-emerald-600 dark:border-[#1D9E75] font-bold' : 'text-slate-500 dark:text-[#6b9e8e] border-transparent font-medium hover:text-emerald-700'}`}
            onClick={() => { setActiveTab(tab.key); setSelectedShelter(null); setSelectedRoute(null); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-5 md:p-6 relative z-10">
        {/* ══ SHELTERS TAB ══ */}
        {activeTab === "shelters" && (
          <div className="animate-[fadeSlideIn_0.3s_ease]">
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex-1 relative flex items-center min-w-[200px]">
                <span className="absolute left-3 text-sm">🔍</span>
                <input
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-[#1D9E75]/25 rounded-lg text-slate-800 dark:text-[#e8f5f1] text-sm py-2 px-3 pl-9 outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Search shelters by name or area..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-1.5">
                {["all", "open", "full"].map(f => (
                  <button
                    key={f}
                    className={`rounded-lg text-sm px-3.5 py-1.5 cursor-pointer capitalize font-medium transition-colors ${filterStatus === f ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-[#1D9E75] font-bold border' : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#6b9e8e] hover:bg-slate-200'}`}
                    onClick={() => setFilterStatus(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredShelters.map(shelter => (
                <div
                  key={shelter.id}
                  className={`border rounded-xl p-4 cursor-pointer transition-colors ${selectedShelter?.id === shelter.id ? 'border-emerald-500/50 bg-emerald-500/5' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-emerald-500/30 shadow-sm'}`}
                  onClick={() => setSelectedShelter(selectedShelter?.id === shelter.id ? null : shelter)}
                >
                  <div className="flex items-start gap-2.5 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ background: shelter.status === "full" ? "rgba(226,75,74,0.15)" : "rgba(29,158,117,0.15)" }}>
                      {shelter.type === "school" ? "🏫" : shelter.type === "govt" ? "🏛️" : shelter.type === "ndrf" ? "⛑️" : "🏢"}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-800 dark:text-[#e8f5f1] leading-tight">{shelter.name}</div>
                      <div className="text-xs text-slate-500 dark:text-[#6b9e8e] mt-0.5">📍 {shelter.area} · {shelter.dist}</div>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full tracking-wider whitespace-nowrap border" style={{ background: shelter.status === "full" ? "rgba(226,75,74,0.15)" : "rgba(29,158,117,0.1)", color: shelter.status === "full" ? "#e24b4a" : "#1D9E75", borderColor: shelter.status === "full" ? "rgba(226,75,74,0.4)" : "rgba(29,158,117,0.4)" }}>
                      {shelter.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-slate-500 dark:text-[#6b9e8e]">Occupancy: {shelter.current} / {shelter.capacity}</span>
                    <span className="font-bold text-sm" style={{ color: capacityPercent(shelter) > 85 ? "#e24b4a" : "#1D9E75" }}>{capacityPercent(shelter)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${capacityPercent(shelter)}%`, background: capacityPercent(shelter) > 85 ? "#e24b4a" : capacityPercent(shelter) > 60 ? "#EF9F27" : "#1D9E75" }} />
                  </div>

                  {selectedShelter?.id === shelter.id && (
                    <div className="border-t border-slate-200 dark:border-white/10 pt-3 mt-1 animate-[fadeSlideIn_0.25s_ease]">
                      <div className="grid grid-cols-2 gap-2.5 mb-3">
                        <div className="flex flex-col gap-0.5"><span className="text-[10px] text-slate-500 dark:text-[#4a7a6a] tracking-wide font-bold">Available Beds</span><span className="text-xs text-slate-700 dark:text-[#c0d8d0] font-medium">{shelter.capacity - shelter.current}</span></div>
                        <div className="flex flex-col gap-0.5"><span className="text-[10px] text-slate-500 dark:text-[#4a7a6a] tracking-wide font-bold">Facilities</span><span className="text-xs text-slate-700 dark:text-[#c0d8d0] font-medium">Water ✓ Food ✓ Medical ✓</span></div>
                        <div className="flex flex-col gap-0.5"><span className="text-[10px] text-slate-500 dark:text-[#4a7a6a] tracking-wide font-bold">Coordinates</span><span className="text-xs text-slate-700 dark:text-[#c0d8d0] font-medium">{shelter.lat}, {shelter.lng}</span></div>
                        <div className="flex flex-col gap-0.5"><span className="text-[10px] text-slate-500 dark:text-[#4a7a6a] tracking-wide font-bold">Authority</span><span className="text-xs text-slate-700 dark:text-[#c0d8d0] font-medium">District Collector</span></div>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-500 dark:to-emerald-700 border-none rounded-lg text-white text-xs font-bold py-2 px-3 cursor-pointer shadow-sm hover:opacity-90" onClick={() => window.open(`https://maps.google.com/?q=${shelter.lat},${shelter.lng}`, "_blank")}>
                          🗺️ Open in Maps
                        </button>
                        <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300 dark:border-white/15 rounded-lg dark:text-[#c0d8d0] text-xs font-bold py-2 px-3 cursor-pointer transition-colors" onClick={() => window.open("tel:1078")}>
                          📞 Call Helpline
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ EVACUATION ROUTES TAB ══ */}
        {activeTab === "routes" && (
          <div className="animate-[fadeSlideIn_0.3s_ease]">
            <p className="text-sm text-slate-600 dark:text-[#6b9e8e] mb-4 leading-relaxed">Select a route to see step-by-step evacuation instructions. Routes are updated in real-time based on flood sensor data.</p>
            <div className="flex flex-col gap-3">
              {MOCK_ROUTES.map(route => (
                <div key={route.id}
                  className={`border rounded-xl p-4 cursor-pointer transition-colors ${selectedRoute?.id === route.id ? 'dark:bg-emerald-900/20 bg-emerald-50/50' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-sm'}`}
                  style={{ borderLeftWidth: 4, borderLeftColor: riskColors[route.risk], background: selectedRoute?.id === route.id ? riskBg[route.risk] : undefined }}
                  onClick={() => setSelectedRoute(selectedRoute?.id === route.id ? null : route)}
                >
                  <div className="flex justify-between items-start flex-wrap gap-2.5">
                    <div>
                      <div className="text-sm font-bold text-slate-800 dark:text-[#e8f5f1]">{route.name}</div>
                      <div className="text-xs text-slate-500 dark:text-[#6b9e8e] mt-1">via {route.via}</div>
                    </div>
                    <div className="flex gap-2.5 items-center flex-wrap">
                      <span className="text-xs text-slate-500 dark:text-[#8ab0a5]">🕐 {route.time}</span>
                      <span className="text-xs text-slate-500 dark:text-[#8ab0a5]">📏 {route.distance}</span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wider whitespace-nowrap" style={{ color: riskColors[route.risk], background: riskBg[route.risk] }}>
                        {route.status === "clear" ? "✅ CLEAR" : route.status === "caution" ? "⚠️ CAUTION" : "🚫 BLOCKED"}
                      </span>
                    </div>
                  </div>

                  {selectedRoute?.id === route.id && (
                    <div className="border-t border-slate-200 dark:border-white/10 mt-3 pt-3 animate-[fadeSlideIn_0.25s_ease]">
                      <div className="text-xs text-slate-500 dark:text-[#4a7a6a] tracking-wide font-bold mb-2.5">Step-by-Step Instructions</div>
                      {route.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2.5 mb-2 text-sm" style={{ color: route.status === "blocked" ? "#e24b4a" : undefined }}>
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shrink-0 mt-0.5" style={{ background: riskColors[route.risk] }}>{i + 1}</span>
                          <span className="text-slate-700 dark:text-[#c0d8d0] pt-0.5">{step}</span>
                        </div>
                      ))}
                      {route.status !== "blocked" && (
                        <button className="bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-500 dark:to-emerald-700 border-none rounded-lg text-white text-xs font-bold py-2 px-3.5 cursor-pointer shadow-sm hover:opacity-90 mt-2" onClick={() => window.open(`https://maps.google.com/`, "_blank")}>
                          🗺️ Navigate Now
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ SAFETY PROTOCOLS TAB ══ */}
        {activeTab === "safety" && (
          <div className="animate-[fadeSlideIn_0.3s_ease]">
            <div className="flex bg-slate-100 dark:bg-white/5 rounded-xl p-1 w-fit mb-4">
              <button className={`bg-transparent border border-transparent rounded-lg text-sm px-6 py-2 cursor-pointer font-medium transition-colors ${dosDontsTab === "dos" ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/50 text-emerald-700 dark:text-[#1D9E75] font-bold shadow-sm' : 'text-slate-500 dark:text-[#6b9e8e]'}`} onClick={() => setDosDontsTab("dos")}>
                ✅ DO's
              </button>
              <button className={`bg-transparent border border-transparent rounded-lg text-sm px-6 py-2 cursor-pointer font-medium transition-colors ${dosDontsTab === "donts" ? 'bg-red-50 dark:bg-red-500/20 border-red-200 dark:border-red-500/50 text-red-600 dark:text-[#f09595] font-bold shadow-sm' : 'text-slate-500 dark:text-[#6b9e8e]'}`} onClick={() => setDosDontsTab("donts")}>
                ❌ DON'Ts
              </button>
            </div>
            <div className="flex flex-col gap-2 mb-6">
              {(dosDontsTab === "dos" ? SAFETY_DOS : SAFETY_DONTS).map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-white dark:bg-white/5 border border-slate-100 dark:border-transparent rounded-xl shadow-sm animate-[fadeSlideIn_0.3s_ease_both]" style={{ borderLeft: `3px solid ${dosDontsTab === "dos" ? "#1D9E75" : "#e24b4a"}`, animationDelay: `${i * 0.06}s` }}>
                  <span className="text-xl mt-0.5">{dosDontsTab === "dos" ? "✅" : "❌"}</span>
                  <span className="text-sm text-slate-700 dark:text-[#c0d8d0] leading-relaxed font-medium">{item}</span>
                </div>
              ))}
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-5 shadow-sm">
              <h3 className="text-base font-bold text-emerald-700 dark:text-[#1D9E75] m-0 mb-3.5">📦 Emergency Kit Checklist</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {["3L Drinking Water", "Non-perishable food (3 days)", "First aid kit", "Torch + batteries", "Whistle", "Waterproof bag", "ID documents (laminated)", "Phone charger + powerbank", "Cash (small denominations)", "Warm clothing + raincoat", "Medicines (7-day supply)", "Baby/elderly care items"].map((item, i) => (
                  <CheckItem key={i} label={item} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ EMERGENCY CONTACTS TAB ══ */}
        {activeTab === "contacts" && (
          <div className="animate-[fadeSlideIn_0.3s_ease]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { name: "National Disaster Helpline", number: "1078", desc: "24/7 flood and disaster relief", icon: "🆘", priority: true },
                { name: "NDRF Control Room", number: "011-24363260", desc: "National Disaster Response Force", icon: "⛑️", priority: true },
                { name: "Tirunelveli District Collector", number: "0462-2333333", desc: "District emergency coordination", icon: "🏛️", priority: false },
                { name: "Tamil Nadu SDRF", number: "044-28447600", desc: "State Disaster Response Force", icon: "🚒", priority: false },
                { name: "Flood Control Room (TN)", number: "044-29510529", desc: "State flood monitoring center", icon: "🌊", priority: false },
                { name: "Police Emergency", number: "100", desc: "Tamil Nadu Police", icon: "👮", priority: false },
                { name: "Ambulance / Medical", number: "108", desc: "Emergency medical services", icon: "🚑", priority: false },
                { name: "Fire & Rescue", number: "101", desc: "Tamil Nadu Fire Services", icon: "🔥", priority: false },
                { name: "IMD Weather Helpline", number: "1800-180-1717", desc: "India Meteorological Department", icon: "🌦️", priority: false },
                { name: "Red Cross Tamil Nadu", number: "044-28270027", desc: "Relief and rehabilitation", icon: "🏥", priority: false },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-white/5 rounded-xl border shadow-sm hover:shadow-md transition-shadow" style={{ borderColor: c.priority ? "rgba(226,75,74,0.4)" : "rgba(150,150,150,0.15)" }}>
                  <span className="text-2xl shrink-0">{c.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-800 dark:text-[#e8f5f1]">{c.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-[#6b9e8e] mt-0.5">{c.desc}</div>
                  </div>
                  <a href={`tel:${c.number}`} className="rounded-lg px-3 py-1.5 text-xs font-bold no-underline whitespace-nowrap shrink-0 border transition-colors hover:opacity-80" style={{ background: c.priority ? "rgba(226,75,74,0.1)" : "rgba(29,158,117,0.1)", color: c.priority ? "#e24b4a" : "#1D9E75", borderColor: c.priority ? "rgba(226,75,74,0.4)" : "rgba(29,158,117,0.35)" }}>
                    📞 Call
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.1} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

// ── CheckItem subcomponent ────────────────────────────────────────────────
function CheckItem({ label }) {
  const [checked, setChecked] = useState(false);
  return (
    <div
      className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border ${checked ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'}`}
      onClick={() => setChecked(!checked)}
    >
      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all border-2 ${checked ? 'bg-emerald-100 dark:bg-emerald-500/30 border-emerald-500' : 'bg-transparent border-slate-300 dark:border-white/25'}`}>
        {checked && <span className="text-emerald-600 dark:text-[#1D9E75] text-xs leading-none">✓</span>}
      </div>
      <span className={`text-[13px] transition-all font-medium ${checked ? 'text-emerald-600 dark:text-[#1D9E75] line-through' : 'text-slate-700 dark:text-[#c0d8d0]'}`}>{label}</span>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
