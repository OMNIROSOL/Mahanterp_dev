import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Filter, Search, RefreshCw, Trash2, User, Package, Clock, Shield, ChevronDown } from 'lucide-react';
import { getApiBaseUrl } from '../utils/apiConfig';

const API = getApiBaseUrl();

const ACTION_COLORS: Record<string, string> = {
    CREATE: 'bg-emerald-100 text-emerald-700',
    UPDATE: 'bg-amber-100 text-amber-700',
    DELETE: 'bg-rose-100 text-rose-700',
    VIEW:   'bg-slate-100 text-slate-600',
    LOGIN:  'bg-indigo-100 text-indigo-700',
    LOGOUT: 'bg-purple-100 text-purple-700',
    BACKUP: 'bg-blue-100 text-blue-700',
};

const AdminActivityLogView = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchUser, setSearchUser] = useState('');
    const [filterModule, setFilterModule] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [limit, setLimit] = useState('200');
    const [showFilters, setShowFilters] = useState(false);

    const token = localStorage.getItem('token') || '';

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchUser) params.set('user', searchUser);
            if (filterModule) params.set('module', filterModule);
            if (filterAction) params.set('action', filterAction);
            if (filterFrom) params.set('from', filterFrom);
            if (filterTo) params.set('to', filterTo);
            params.set('limit', limit);
            const res = await fetch(`${API}/admin/activity-logs?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setLogs(Array.isArray(data) ? data : []);
        } catch {
            setLogs([]);
        } finally {
            setIsLoading(false);
        }
    }, [token, searchUser, filterModule, filterAction, filterFrom, filterTo, limit]);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    const handleClearOld = async () => {
        if (!window.confirm('Delete activity logs older than 90 days?')) return;
        await fetch(`${API}/admin/activity-logs?olderThanDays=90`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
        });
        loadLogs();
    };

    const modules = [...new Set(logs.map(l => l.module))].sort();
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 'BACKUP'];

    // Stats
    const today = new Date().toDateString();
    const todayLogs = logs.filter(l => new Date(l.createdAt).toDateString() === today);
    const creates = logs.filter(l => l.action === 'CREATE').length;
    const deletes = logs.filter(l => l.action === 'DELETE').length;
    const uniqueUsers = new Set(logs.map(l => l.userName)).size;

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600">
                        <Activity size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Activity Log</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Track all user actions across the system</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadLogs} className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                        <RefreshCw size={14} /> Refresh
                    </button>
                    <button onClick={handleClearOld} className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-100 transition-colors">
                        <Trash2 size={14} /> Clear Old (&gt;90 days)
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Today's Activities", value: todayLogs.length, icon: Clock, color: 'indigo' },
                    { label: 'Active Users', value: uniqueUsers, icon: User, color: 'violet' },
                    { label: 'Creates', value: creates, icon: Package, color: 'emerald' },
                    { label: 'Deletions', value: deletes, icon: Trash2, color: 'rose' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                                <p className="text-2xl font-black text-slate-800">{value}</p>
                            </div>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}-50 text-${color}-500`}>
                                <Icon size={20} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by user or email..."
                            value={searchUser}
                            onChange={e => setSearchUser(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                        <Filter size={14} /> Filters <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
                        <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                            <option value="">All Modules</option>
                            {modules.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                            <option value="">All Actions</option>
                            {actions.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="From date" />
                        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="To date" />
                        <select value={limit} onChange={e => setLimit(e.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                            {['50', '100', '200', '500', '1000'].map(l => <option key={l} value={l}>Show {l}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* Log Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Log Entries</h2>
                    <span className="text-xs text-slate-400 font-medium">{logs.length} record(s)</span>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw size={24} className="animate-spin text-slate-300" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Activity size={36} className="mb-3 opacity-30" />
                        <p className="font-semibold">No activity recorded yet</p>
                        <p className="text-sm mt-1">Activity will appear here as users interact with the system</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    {['Time', 'User', 'Role', 'Action', 'Module', 'Reference', 'Details', 'IP'].map(h => (
                                        <th key={h} className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log, i) => (
                                    <tr key={log.id || i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3 px-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                                            {new Date(log.createdAt).toLocaleDateString()} <br />
                                            <span className="text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 text-[10px] font-black flex items-center justify-center uppercase">
                                                    {(log.userName || 'U').substring(0, 2)}
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700 max-w-[120px] truncate">{log.userName || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-xs font-medium text-slate-500">{log.userRole || '—'}</td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm font-medium text-slate-700">{log.module}</td>
                                        <td className="py-3 px-4 text-sm font-mono text-slate-600">{log.reference || '—'}</td>
                                        <td className="py-3 px-4 text-xs text-slate-400 max-w-[180px] truncate" title={log.details}>{log.details || '—'}</td>
                                        <td className="py-3 px-4 text-xs font-mono text-slate-400">{log.ipAddress || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminActivityLogView;
