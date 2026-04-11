// src/Hydrologicalstability.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";

// ─── Fake real-time data generators ───────────────────────────────────────────
const generateWaterLevelData = () =>
  Array.from({ length: 12 }, (_, i) => ({
    time: `${6 + i}:00`,
    level: +(2.5 + Math.random() * 3).toFixed(2),
    threshold: 5.0,
    predicted: +(2.8 + Math.random() * 3.2).toFixed(2),
  }));

const generateRainfallData = () =>
  Array.from({ length: 7 }, (_, i) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
    rainfall: +(10 + Math.random() * 80).toFixed(1),
    runoff: +(5 + Math.random() * 60).toFixed(1),
  }));

const riverStations = [
  {
    id: 1,
    name: "Ulhas River - Badlapur",
    level: 4.2,
    max: 6.0,
    status: "Warning",
    color: "#f59e0b",
    trend: "↑ Rising",
    lat: "19.15°N",
    lng: "73.25°E",
  },
  {
    id: 2,
    name: "Mithi River - CST Road",
    level: 2.8,
    max: 5.5,
    status: "Normal",
    color: "#10b981",
    trend: "→ Stable",
    lat: "19.07°N",
    lng: "72.87°E",
  },
  {
    id: 3,
    name: "Dahisar River - Borivali",
    level: 5.1,
    max: 6.0,
    status: "Critical",
    color: "#ef4444",
    trend: "↑↑ Surge",
    lat: "19.23°N",
    lng: "72.85°E",
  },
  {
    id: 4,
    name: "Poisar River - Kandivali",
    level: 1.9,
    max: 5.0,
    status: "Normal",
    color: "#10b981",
    trend: "↓ Receding",
    lat: "19.20°N",
    lng: "72.84°E",
  },
];

const mlMetrics = [
  { name: "Accuracy",  value: 94, fill: "#06b6d4" },
  { name: "Precision", value: 91, fill: "#0891b2" },
  { name: "Recall",    value: 88, fill: "#0e7490" },
];

// ─── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const styles = {
    Normal:   "bg-emerald-100 text-emerald-700 border border-emerald-300",
    Warning:  "bg-amber-100  text-amber-700  border border-amber-300",
    Critical: "bg-red-100    text-red-700    border border-red-300 animate-pulse",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[status]}`}>
      {status === "Critical" && "🚨 "}
      {status === "Warning"  && "⚠️ "}
      {status === "Normal"   && "✅ "}
      {status}
    </span>
  );
};

// ─── Water Level Progress Bar ──────────────────────────────────────────────────
const WaterLevelBar = ({ level, max }) => {
  const pct = Math.min((level / max) * 100, 100);
  const barColor = pct > 85 ? "#ef4444" : pct > 65 ? "#f59e0b" : "#10b981";
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
      <div
        className="h-3 rounded-full transition-all duration-1000"
        style={{ width: `${pct}%`, backgroundColor: barColor }}
      />
    </div>
  );
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color }) => (
  <div
    className="bg-white dark:bg-slate-800/60 rounded-2xl p-5 shadow-sm dark:shadow-none border dark:border-cyan-800/30 border-l-4 flex items-center gap-4 transition-colors"
    style={{ borderLeftColor: color, borderTopColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'transparent' }}
  >
    <div
      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
      style={{ backgroundColor: `${color}20` }}
    >
      {icon}
    </div>
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  </div>
);

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
const HydrologicalStability = () => {
  const navigate = useNavigate();
  const [waterData,    setWaterData]    = useState(generateWaterLevelData());
  const [rainfallData]                  = useState(generateRainfallData());
  const [lastUpdated,  setLastUpdated]  = useState(new Date());
  const [activeTab,    setActiveTab]    = useState("overview");
  const [alertVisible, setAlertVisible] = useState(true);

  // Live data refresh every 5 s
  useEffect(() => {
    const interval = setInterval(() => {
      setWaterData(generateWaterLevelData());
      setLastUpdated(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 text-slate-900 dark:text-white pb-20 sm:pb-0">

      {/* ── TOP NAV ── */}
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-cyan-800/40 px-6 py-4 flex items-center justify-between sticky top-0 z-50 transition-colors">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className="text-gray-300 dark:text-gray-500">|</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">💧</div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Flood Guard</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Hydrological Stability</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-full px-4 py-1.5 transition-colors">
            <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">Live Monitoring</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </nav>

      {/* ── CRITICAL ALERT BANNER ── */}
      {alertVisible && (
        <div className="bg-red-600/90 border-b border-red-400/50 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl animate-bounce">🚨</span>
            <div>
              <p className="font-bold text-sm">CRITICAL ALERT — Dahisar River surge detected!</p>
              <p className="text-xs text-red-200">
                ML model predicts 85% flood probability in next 3 hours. Water level: 5.1m / 6.0m threshold.
              </p>
            </div>
          </div>
          <button onClick={() => setAlertVisible(false)} className="text-red-200 hover:text-white text-lg">✕</button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── HERO HEADER ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/40 rounded-2xl flex items-center justify-center text-2xl transition-colors">💧</div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">Hydrological Stability</h1>
              <p className="text-cyan-700 dark:text-cyan-400 text-sm font-medium">Real-time water level monitoring · Mumbai Metropolitan Region</p>
            </div>
          </div>
          <p className="text-slate-600 dark:text-gray-400 mt-3 max-w-3xl leading-relaxed">
            Our ML-powered system continuously monitors water levels across{" "}
            <span className="text-cyan-600 dark:text-cyan-300 font-semibold">4 major river stations</span> in Mumbai,
            using LSTM neural networks and precipitation data to predict flood surges up to{" "}
            <span className="text-cyan-600 dark:text-cyan-300 font-semibold">6 hours in advance</span> with 94% accuracy.
          </p>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon="🌊" label="Avg Water Level"   value="3.5m"   sub="Across 4 stations"         color="#06b6d4" />
          <StatCard icon="🌧️" label="24hr Rainfall"     value="87mm"   sub="Above seasonal avg"        color="#f59e0b" />
          <StatCard icon="⚡"  label="Surge Probability" value="62%"    sub="Next 6 hours (ML)"         color="#ef4444" />
          <StatCard icon="🤖" label="Model Accuracy"    value="94.2%"  sub="LSTM + Random Forest"      color="#10b981" />
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-2 mb-6 bg-white dark:bg-slate-800/50 shadow-sm dark:shadow-none border border-gray-200 dark:border-transparent rounded-xl p-1 w-fit flex-wrap transition-colors">
          {["overview", "stations", "ml-model", "forecast"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/25"
                  : "text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {tab === "ml-model"  ? "🤖 ML Model" :
               tab === "overview"  ? "📊 Overview" :
               tab === "stations"  ? "📍 Stations" : "🔮 Forecast"}
            </button>
          ))}
        </div>

        {/* ══════════════ TAB: OVERVIEW ══════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Water Level Chart */}
            <div className="bg-white dark:bg-slate-800/60 backdrop-blur rounded-2xl shadow-sm dark:shadow-none border border-gray-200 dark:border-cyan-800/30 p-6 transition-colors">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">📈 Water Level Trend (Today)</h2>
                  <p className="text-xs text-slate-500 dark:text-gray-400">Actual vs ML-Predicted levels • Flood threshold: 5.0m</p>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1"><div className="w-3 h-1 bg-cyan-400 rounded" /> Actual</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-1 bg-purple-400 rounded" /> Predicted</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-1 bg-red-400 rounded" /> Threshold</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={waterData}>
                  <defs>
                    <linearGradient id="levelGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="time" className="stroke-slate-400 dark:stroke-slate-500 text-xs" />
                  <YAxis className="stroke-slate-400 dark:stroke-slate-500 text-xs" unit="m" />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #0891b2", borderRadius: "8px", color: "#fff" }} />
                  <Area type="monotone" dataKey="level"     stroke="#06b6d4" strokeWidth={2.5} fill="url(#levelGrad)" name="Actual Level"   />
                  <Area type="monotone" dataKey="predicted" stroke="#a855f7" strokeWidth={2}   strokeDasharray="5 5" fill="url(#predGrad)" name="ML Predicted" />
                  <Line type="monotone" dataKey="threshold" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="8 4" dot={false}            name="Flood Threshold" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Rainfall Chart */}
            <div className="bg-white dark:bg-slate-800/60 backdrop-blur rounded-2xl shadow-sm dark:shadow-none border border-gray-200 dark:border-cyan-800/30 p-6 transition-colors">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">🌧️ Weekly Rainfall vs Surface Runoff</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">Precipitation data fed into ML model for surge prediction</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={rainfallData}>
                  <defs>
                    <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="day" className="stroke-slate-400 dark:stroke-slate-500 text-xs" />
                  <YAxis className="stroke-slate-400 dark:stroke-slate-500 text-xs" unit="mm" />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #0891b2", borderRadius: "8px", color: "#fff" }} />
                  <Area type="monotone" dataKey="rainfall" stroke="#0ea5e9" strokeWidth={2} fill="url(#rainGrad)" name="Rainfall (mm)" />
                  <Area type="monotone" dataKey="runoff"   stroke="#f59e0b" strokeWidth={2} fill="none"          name="Runoff (mm)"   />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ══════════════ TAB: STATIONS ══════════════ */}
        {activeTab === "stations" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800/40 rounded-xl shadow-sm dark:shadow-none border border-cyan-100 dark:border-cyan-800/20 p-4 mb-2 transition-colors">
              <p className="text-sm text-cyan-800 dark:text-cyan-300">
                📡 <strong>4 IoT sensor stations</strong> deployed across Mumbai rivers —
                streaming live water level data every <strong>30 seconds</strong> to our ML pipeline.
              </p>
            </div>
            {riverStations.map((station) => (
              <div
                key={station.id}
                className="bg-white dark:bg-slate-800/60 backdrop-blur rounded-2xl shadow-sm dark:shadow-none border border-gray-200 dark:border-cyan-800/30 p-5 hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                      style={{ backgroundColor: `${station.color}25`, color: station.color }}
                    >
                      S{station.id}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{station.name}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-400">{station.lat} · {station.lng}</p>
                      <p className="text-sm mt-1 font-semibold" style={{ color: station.color }}>{station.trend}</p>
                    </div>
                  </div>
                  <div className="sm:text-right min-w-[160px]">
                    <StatusBadge status={station.status} />
                    <p className="text-2xl font-black text-slate-800 dark:text-white mt-2">
                      {station.level}m
                      <span className="text-sm text-slate-400 dark:text-gray-400 font-normal"> / {station.max}m</span>
                    </p>
                    <WaterLevelBar level={station.level} max={station.max} color={station.color} />
                    <p className="text-xs text-slate-500 dark:text-gray-500 mt-1">
                      {((station.level / station.max) * 100).toFixed(0)}% of threshold
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════ TAB: ML MODEL ══════════════ */}
        {activeTab === "ml-model" && (
          <div className="space-y-6">
            {/* ML Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: "LSTM Neural Network",
                  icon: "🧠",
                  desc: "Long Short-Term Memory model trained on 10 years of Mumbai hydrological data. Captures temporal patterns in water-level sequences.",
                  tech: "Python · TensorFlow · Keras",
                  color: "#06b6d4",
                },
                {
                  title: "Random Forest Classifier",
                  icon: "🌲",
                  desc: "Ensemble model combining 200 decision trees. Uses rainfall, soil saturation, tide levels, and historical surges as features.",
                  tech: "Scikit-learn · Python",
                  color: "#10b981",
                },
                {
                  title: "Real-Time Pipeline",
                  icon: "⚡",
                  desc: "FastAPI backend streams sensor data through preprocessing → feature engineering → model inference → alert generation in <2 seconds.",
                  tech: "FastAPI · Redis · WebSocket",
                  color: "#f59e0b",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm dark:shadow-none border border-gray-200 dark:border-cyan-800/30 p-5 hover:scale-[1.02] transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3"
                    style={{ backgroundColor: `${card.color}20` }}
                  >
                    {card.icon}
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white mb-2">{card.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed mb-3">{card.desc}</p>
                  <span
                    className="text-xs font-mono px-3 py-1 rounded-full"
                    style={{ backgroundColor: `${card.color}15`, color: card.color }}
                  >
                    {card.tech}
                  </span>
                </div>
              ))}
            </div>

            {/* Model Performance */}
            <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm dark:shadow-none border border-gray-200 dark:border-cyan-800/30 p-6 transition-colors">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">📊 Model Performance Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={250}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={mlMetrics}>
                    <RadialBar minAngle={15} dataKey="value" cornerRadius={10} label={{ fill: "#fff", fontSize: 12 }} />
                    <Legend iconSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #0891b2", borderRadius: "8px", color: "#fff" }}
                      formatter={(v) => `${v}%`}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="space-y-4">
                  {[
                    { label: "Model Accuracy",       value: "94.2%",    icon: "🎯", color: "#06b6d4" },
                    { label: "Precision",             value: "91.8%",    icon: "📌", color: "#10b981" },
                    { label: "Recall",                value: "88.5%",    icon: "🔍", color: "#f59e0b" },
                    { label: "F1-Score",              value: "0.90",     icon: "⚖️", color: "#a855f7" },
                    { label: "Prediction Lead Time",  value: "6 hours",  icon: "⏱️", color: "#ef4444" },
                    { label: "Training Data",         value: "2014–2024",icon: "📅", color: "#64748b" },
                  ].map((m) => (
                    <div key={m.label} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-gray-400 text-sm">{m.icon} {m.label}</span>
                      <span className="font-bold text-slate-800 dark:text-white">{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature Importance */}
            <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm dark:shadow-none border border-gray-200 dark:border-cyan-800/30 p-6 transition-colors">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">🔬 ML Feature Importance</h2>
              <div className="space-y-3">
                {[
                  { feature: "24hr Cumulative Rainfall",    importance: 92, color: "#0ea5e9" },
                  { feature: "River Water Level (t-6h)",    importance: 87, color: "#06b6d4" },
                  { feature: "Soil Moisture Index",         importance: 76, color: "#10b981" },
                  { feature: "Tidal Amplitude",             importance: 68, color: "#f59e0b" },
                  { feature: "Upstream Flow Rate",          importance: 61, color: "#a855f7" },
                  { feature: "Temperature Gradient",        importance: 34, color: "#64748b" },
                ].map((item) => (
                  <div key={item.feature}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-gray-300">{item.feature}</span>
                      <span className="text-slate-500 dark:text-gray-400">{item.importance}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${item.importance}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ TAB: FORECAST ══════════════ */}
        {activeTab === "forecast" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { period: "Next 2 Hours", risk: "Moderate", prob: "52%", action: "Monitor closely",    color: "#f59e0b", icon: "⚠️" },
                { period: "Next 4 Hours", risk: "High",     prob: "74%", action: "Prepare evacuation", color: "#f97316", icon: "🔶" },
                { period: "Next 6 Hours", risk: "Critical", prob: "85%", action: "Evacuate low areas", color: "#ef4444", icon: "🚨" },
              ].map((fc) => (
                <div
                  key={fc.period}
                  className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm dark:shadow-none border p-5 text-center transition-colors"
                  style={{ borderColor: `${fc.color}40`, borderTopWidth: '4px', borderTopColor: fc.color }}
                >
                  <p className="text-4xl mb-2">{fc.icon}</p>
                  <p className="text-sm text-slate-500 dark:text-gray-400 mb-1">{fc.period}</p>
                  <p className="text-3xl font-black mb-1" style={{ color: fc.color }}>{fc.prob}</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mb-2">Flood Probability</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mb-3">{fc.action}</p>
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ backgroundColor: `${fc.color}20`, color: fc.color }}
                  >
                    {fc.risk} Risk
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-red-50 dark:bg-gradient-to-r dark:from-red-900/40 dark:to-orange-900/40 border border-red-200 dark:border-red-500/30 rounded-2xl p-6 transition-colors">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-3">🚁 Recommended Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "🚶 Begin pre-emptive evacuation of Dahisar riverbank zones",
                  "🚧 Deploy flood barriers at Poisar & Ulhas overflow points",
                  "📢 Issue public advisory for areas below 5m elevation",
                  "🏥 Keep emergency shelters on standby (capacity: 12,400 people)",
                  "🚒 Alert NDRF teams in Thane & Mumbai districts",
                  "🌐 Activate real-time SMS alert system for 2.3L residents",
                ].map((action) => (
                  <div key={action} className="flex items-start gap-2 bg-white dark:bg-slate-800/40 rounded-xl p-3 border border-red-100 dark:border-transparent transition-colors">
                    <span className="text-sm text-slate-700 dark:text-gray-300">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div className="mt-8 text-center text-xs text-slate-500 dark:text-gray-600 pb-8 sm:pb-0">
          Flood Guard · Final Year Project · ML-Powered Flood &amp; Landslide Prediction
        </div>
      </div>
    </div>
  );
};

export default HydrologicalStability;
