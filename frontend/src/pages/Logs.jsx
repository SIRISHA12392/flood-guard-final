import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCcw, AlertTriangle, CloudRain, CheckCircle, Clock, MapPin, Map as MapIcon, SlidersHorizontal } from 'lucide-react';
import NavBar from '../components/NavBar';
import { logsAPI } from '../services/api';

export default function Logs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState('All');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await logsAPI.getAll(100);
      setLogs(res.data.logs || []);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      console.error('Logs fetch error:', err);
      setError('Failed to fetch logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30_000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  // Filtering
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchRisk = filterRisk === 'All' || log.risk_level === filterRisk;
      const q = searchQuery.toLowerCase();
      const matchSearch = 
        (log.location_name || '').toLowerCase().includes(q) ||
        (log.risk_status || '').toLowerCase().includes(q) ||
        (log.risk_level || '').toLowerCase().includes(q);
      
      return matchRisk && matchSearch;
    });
  }, [logs, filterRisk, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: logs.length,
    high: logs.filter(l => l.risk_level === 'High').length,
    medium: logs.filter(l => l.risk_level === 'Medium').length,
    low: logs.filter(l => l.risk_level === 'Low').length,
  }), [logs]);

  // Helper formatting
  const formatTime = (ts) => {
    if (!ts) return '—';
    // If it's the IST readable string (e.g., '14-04-2026 09:33:00 PM')
    if (ts.includes('-')) return ts;
    return new Date(ts).toLocaleString();
  };

  const getRowStyle = (riskLevel) => {
    switch(riskLevel) {
      case 'High': return 'bg-red-50/50 hover:bg-red-50 border-l-4 border-red-500';
      case 'Medium': return 'bg-amber-50/50 hover:bg-amber-50 border-l-4 border-amber-500';
      case 'Low': return 'bg-white hover:bg-slate-50 border-l-4 border-emerald-500';
      default: return 'bg-white hover:bg-slate-50 border-l-4 border-slate-300';
    }
  };

  const getBadgeStyle = (riskLevel) => {
    switch(riskLevel) {
      case 'High': return 'bg-red-100 text-red-700 ring-1 ring-red-600/20';
      case 'Medium': return 'bg-amber-100 text-amber-700 ring-1 ring-amber-600/20';
      case 'Low': return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20';
      default: return 'bg-slate-100 text-slate-700 ring-1 ring-slate-600/20';
    }
  };

  const viewOnMap = (lat, lon) => {
    navigate(`/map?lat=${lat}&lon=${lon}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative selection:bg-blue-100">
      <NavBar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in custom-scrollbar">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 drop-shadow-sm flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-600" />
              Event Logs
            </h1>
            <p className="text-slate-600 mt-2">Monitor real-time system alerts, user location tracking, and risk level events.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-full shadow-sm border border-slate-200">
            <div className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <span className="text-sm font-medium text-slate-700">System Live</span>
            {lastRefresh && (
              <span className="text-xs text-slate-500 ml-2 border-l border-slate-300 pl-3">
                Updated: {lastRefresh.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Events', value: stats.total, icon: SlidersHorizontal, bg: 'bg-blue-500', text: 'text-blue-50' },
            { label: 'High Risk', value: stats.high, icon: AlertTriangle, bg: 'bg-red-500', text: 'text-red-50' },
            { label: 'Medium Risk', value: stats.medium, icon: CloudRain, bg: 'bg-amber-500', text: 'text-amber-50' },
            { label: 'Low Risk', value: stats.low, icon: CheckCircle, bg: 'bg-emerald-500', text: 'text-emerald-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300">
              <div className={`p-4 rounded-xl ${stat.bg} ${stat.text} shadow-inner`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row gap-4 justify-between items-center z-10 w-full backdrop-blur-md">
          
          {/* Search */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search locations or events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Filters & Actions */}
          <div className="flex w-full md:w-auto items-center gap-3 overflow-x-auto pb-1 md:pb-0">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {['All', 'High', 'Medium', 'Low'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterRisk(f)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    filterRisk === f 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors border border-blue-200 ml-auto md:ml-0"
              title="Refresh Logs"
            >
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 flex items-center gap-3 text-sm font-medium border-b border-red-100">
              <AlertTriangle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-widest font-semibold">
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Event Type</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Risk Level</th>
                  <th className="px-6 py-4">Message</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading && logs.length === 0 ? (
                   <tr>
                     <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                       <div className="flex flex-col items-center gap-3">
                         <RefreshCcw className="w-8 h-8 animate-spin text-blue-500" />
                         <span className="font-medium text-slate-600">Loading events...</span>
                       </div>
                     </td>
                   </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="inline-flex flex-col items-center gap-3 p-6 bg-slate-50 rounded-2xl">
                        <Search className="w-10 h-10 text-slate-400" />
                        <span className="font-medium text-slate-600 text-base">No logs found.</span>
                        <p className="text-slate-500 text-sm">Try adjusting your filters or search query.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                   filteredLogs.map((log) => {
                     const isHighRisk = log.risk_level === 'High';
                     return (
                       <tr key={log.id} className={`transition-colors duration-150 ${getRowStyle(log.risk_level)}`}>
                         <td className="px-6 py-4 font-medium text-slate-700">
                           {formatTime(log.timestamp)}
                         </td>
                         <td className="px-6 py-4 font-semibold text-slate-800">
                           {log.risk_status || 'Unknown'}
                         </td>
                         <td className="px-6 py-4 text-slate-600">
                           <div className="flex items-center gap-2 max-w-[200px] truncate" title={log.location_name}>
                             <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                             <span className="truncate">{log.location_name || `${log.latitude.toFixed(4)}, ${log.longitude.toFixed(4)}`}</span>
                           </div>
                         </td>
                         <td className="px-6 py-4">
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide ${getBadgeStyle(log.risk_level)}`}>
                             {log.risk_level}
                           </span>
                         </td>
                         <td className="px-6 py-4 text-slate-600 max-w-[300px] truncate" title={isHighRisk ? `High risk zone near ${log.location_name}` : `Location logged safely.`}>
                           {isHighRisk ? (
                             <span className="text-red-600 font-medium flex items-center gap-1.5"><AlertTriangle className="w-4 h-4"/> Critical alert threshold reached.</span>
                           ) : (
                             <span>System recorded location.</span>
                           )}
                         </td>
                         <td className="px-6 py-4">
                           <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                             <CheckCircle className="w-4 h-4 text-emerald-500" />
                             Logged
                           </span>
                         </td>
                         <td className="px-6 py-4 text-center">
                           <button 
                              onClick={() => viewOnMap(log.latitude, log.longitude)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition-colors duration-200 border border-blue-100 hover:border-transparent cursor-pointer"
                           >
                             <MapIcon className="w-3.5 h-3.5" />
                             View Map
                           </button>
                         </td>
                       </tr>
                     );
                   })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-scrollbar ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
